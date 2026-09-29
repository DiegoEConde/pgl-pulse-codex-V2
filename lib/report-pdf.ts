import type { Report, PieMode, RankingMode } from "./reports";
import { reportSlices, reportRanking, rankingLabels, pieLabels } from "./reports";

export async function exportReportPdf(report: Report, title: string, mode: PieMode, ranking: RankingMode, top: boolean, details = false) {
 // Carga la librería solo al exportar; el documento se genera en el navegador.
 const { jsPDF } = await import("jspdf");
 const doc=new jsPDF();
 let y=20;
 const clean=(value:string)=>value.replace(/[\r\n\t]+/g," ").replace(/[^\x20-\xFF]/g,"-");
 const usd=(value:number)=>"USD "+value.toFixed(2);
 // El mismo escritor ajusta las líneas largas y abre páginas cuando se agota el espacio.
 const line=(text:string,size=10)=>{
  doc.setFontSize(size);
  const rows=doc.splitTextToSize(clean(text),174) as string[];
  for(const row of rows){if(y>276){doc.addPage();y=20;}doc.text(row,18,y);y+=size>12?8:6;}
 };
 doc.setTextColor(22,45,65);
 line("PGL PULSE | REPORTES",12);line(title,20);
 line(report.filter.start+" al "+report.filter.end);
 const filters=report.filter;
 line("Alcance: "+({both:"Compras y ventas",purchases:"Compras",sales:"Ventas"}[filters.scope ?? "both"]));
 for(const key of ["product","supplier","seller","client"] as const) if(filters[key])line(({product:"Producto",supplier:"Proveedor",seller:"Vendedor",client:"Cliente"}[key])+": ID "+filters[key]);
 y+=4;
 line("Costo total: "+usd(report.cost)+" | Unidades compradas: "+report.units);
 line("Total de ventas: "+usd(report.revenue)+" | Ganancia: "+usd(report.profit));
 y+=6;line(pieLabels[mode]+(top?" - Top 10":""),14);
 const data=reportSlices(report,mode,top);
 if(data.length){
  if(y+62>276){doc.addPage();y=20;}
  const canvas=document.createElement("canvas");canvas.width=400;canvas.height=400;
  const ctx=canvas.getContext("2d");
  if(ctx){const colors=["#339cff","#54d5f4","#56d6a3","#9386ff","#f1bd65","#ff7e7e","#ed91ce","#91b84e","#5da4c8","#c5a27b"];const total=data.reduce((s,r)=>s+r.value,0);let angle=0;
   for(let i=0;i<data.length;i++){const next=angle+data[i].value/total*Math.PI*2;ctx.beginPath();ctx.moveTo(200,200);ctx.arc(200,200,194,angle,next);ctx.closePath();ctx.fillStyle=colors[i%colors.length];ctx.fill();angle=next;}
   doc.addImage(canvas.toDataURL("image/png"),"PNG",18,y,58,58);y+=64;
  }
  for(const row of data)line(row.label+": "+row.value+" unidades");
 }else line("Sin movimientos en este período.");
 y+=5;line("Top 5 - "+rankingLabels[ranking]+(ranking==="products"?" (costo unitario)":ranking==="soldProducts"?" (precio unitario de venta)":""),14);
 const ranks=reportRanking(report,ranking).map(r=>r.label+" | "+(ranking==="products"||ranking==="soldProducts"?usd(r.value):r.value+" unidades"));
 if(!ranks.length)line("Sin movimientos en este período.");
 ranks.forEach((text,i)=>line((i+1)+". "+text));
 if(details){
  y+=6;line("Detalle de operaciones",14);
  for(const [label,rows] of [["Compra",report.purchases],["Venta",report.sales]] as const){
   for(const row of rows)line(label+" #"+row.id+" | "+row.date+" | "+row.product+" | "+row.quantity+" unidades | Costo: "+usd(row.cost)+(label==="Venta"?" | "+row.client+" | "+row.seller+" | Venta: "+usd(row.revenue)+" | Comisión: "+usd(row.commission)+" | Ganancia: "+usd(row.profit):" | "+row.supplier));
  }
 }
 const pages=doc.getNumberOfPages();
 for(let i=1;i<=pages;i++){doc.setPage(i);doc.setFontSize(8);doc.setTextColor(100);doc.text("PGL Pulse - "+i+" / "+pages,18,289);}
 doc.save("pgl-reporte-"+report.filter.start+"-"+report.filter.end+".pdf");
}
