import { chartLabels, dimensionLabels, metricLabels, moneyMetric, type CustomOptions, type Report, type Slice } from "./reports";
export async function exportCustomReportPdf(title:string,context:string[],report:Report,options:CustomOptions,data:Slice[],svg:SVGSVGElement|null,details:boolean) {
 const {jsPDF}=await import("jspdf");const doc=new jsPDF();let y=20;
 const line=(text:string,size=10)=>{doc.setFontSize(size);const rows=doc.splitTextToSize(text.replace(/[^\x20-\xFF]/g,"-"),174) as string[];for(const row of rows){if(y>276){doc.addPage();y=20;}doc.text(row,18,y);y+=size>12?9:6;}};
 line(title,18);line(report.filter.start+" al "+report.filter.end);line(chartLabels[options.chart]+" | "+metricLabels[options.metric]+" por "+dimensionLabels[options.dimension]);context.forEach(text=>line(text));
 if(svg){
  const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)],{type:"image/svg+xml;charset=utf-8"}));
  try {const image=new Image();await new Promise<void>((resolve,reject)=>{image.onload=()=>resolve();image.onerror=()=>reject(new Error("No se pudo generar el gráfico"));image.src=url;});
   const canvas=document.createElement("canvas"),ratio=svg.viewBox.baseVal.height/svg.viewBox.baseVal.width;canvas.width=1440;canvas.height=Math.ceil(1440*ratio);const ctx=canvas.getContext("2d");if(!ctx)throw new Error("Canvas no disponible");ctx.drawImage(image,0,0,canvas.width,canvas.height);
   const height=Math.min(160,174*ratio),width=height/ratio;if(y+height>275){doc.addPage();y=20;}doc.addImage(canvas.toDataURL("image/png"),"PNG",18,y,width,height);y+=height+10;
  }finally{URL.revokeObjectURL(url);}
 }
 if(!data.length)line("Sin movimientos con estos filtros.");
 data.forEach((row,i)=>line((i+1)+". "+row.label+": "+(moneyMetric(options.metric)?"USD "+row.value.toFixed(2):String(row.value))));
 if(details){line("Detalle de operaciones",14);for(const row of [...report.purchases,...report.sales])line(row.date+" | "+row.product+" | "+row.quantity+" unidades | "+row.supplier+" | "+row.client+" | "+row.seller+" | Costo USD "+row.cost.toFixed(2)+" | Venta USD "+row.revenue.toFixed(2)+" | Ganancia USD "+row.profit.toFixed(2));}
 doc.save("pgl-personalizado-"+report.filter.start+"-"+report.filter.end+".pdf");
}
