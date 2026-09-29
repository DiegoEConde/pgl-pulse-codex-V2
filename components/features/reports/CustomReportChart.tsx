import { chartLabels, type CustomChart, type Slice } from "@/lib/reports";
import { pieColors } from "./ReportPie";
import styles from "./ReportsScreen.module.css";

export default function CustomReportChart({data,chart,format}:{data:Slice[];chart:CustomChart;format:(value:number)=>string}) {
 if(!data.length)return <p className={styles.empty}>Sin movimientos con estos filtros.</p>;
 if(chart==="list")return null;
 const min=Math.min(0,...data.map(r=>r.value)),max=Math.max(0,...data.map(r=>r.value)),span=max-min||1;
 const y=(value:number)=>260-(value-min)/span*230;
 const x=(index:number)=>70+(index+.5)*610/data.length;
 const total=data.reduce((s,r)=>s+r.value,0);
 if(chart==="pie" && (min<0||!total))return <p role="alert">El gráfico circular requiere valores positivos. Elegí barras o líneas.</p>;
 let angle=-Math.PI/2;
 return <div className={styles.customChartWrap}><svg xmlns="http://www.w3.org/2000/svg" viewBox={chart==="bars"?"0 0 720 "+Math.max(140,data.length*36+45):"0 0 720 340"} role="img" aria-label={chartLabels[chart]} className={styles.customChart} style={{background:"#101720",color:"#d8e8f6"}}>
  {chart==="pie"?data.map((row,i)=>{const start=angle;angle+=row.value/total*Math.PI*2;const x1=190+130*Math.cos(start),y1=160+130*Math.sin(start),x2=190+130*Math.cos(angle),y2=160+130*Math.sin(angle);return <g key={row.id}><title>{row.label+": "+format(row.value)+" ("+(row.value/total*100).toFixed(1)+"%)"}</title>{row.value===total?<circle cx="190" cy="160" r="130" fill={pieColors[i%10]}/>:<path d={"M190,160 L"+x1+","+y1+" A130,130 0 "+(angle-start>Math.PI?1:0)+",1 "+x2+","+y2+" Z"} fill={pieColors[i%10]}/>}<rect x="360" y={30+i*28} width="10" height="10" fill={pieColors[i%10]}/><text x="380" y={40+i*28} fill="#d8e8f6" fontSize="13">{row.label.slice(0,26)+" · "+(row.value/total*100).toFixed(1)+"%"}</text></g>;})
  :chart==="bars"?data.map((row,i)=>{const zero=240+(0-min)/span*340,pos=240+(row.value-min)/span*340;return <g key={row.id}><title>{row.label+": "+format(row.value)}</title><text x="8" y={28+i*36} fill="#d8e8f6" fontSize="13">{row.label.length>30?row.label.slice(0,27)+"…":row.label}</text><line x1={zero} x2={zero} y1={10+i*36} y2={36+i*36} stroke="#7f90a2"/><rect x={Math.min(zero,pos)} y={12+i*36} width={Math.max(1,Math.abs(pos-zero))} height="23" rx="3" fill={row.value<0?"#ff7e7e":"#339cff"}/><text x="595" y={28+i*36} fill="#d8e8f6" fontSize="12">{format(row.value)}</text></g>;})
  :<>
   {[0,1,2,3,4].map(i=>{const value=min+span*i/4;return <g key={i}><line x1="70" x2="680" y1={y(value)} y2={y(value)} stroke="#2b3c4d"/><text x="64" y={y(value)+4} textAnchor="end" fill="#9cabbc" fontSize="10">{new Intl.NumberFormat("es-AR",{notation:"compact",maximumFractionDigits:1}).format(value)}</text></g>;})}
   <line x1="70" x2="680" y1={y(0)} y2={y(0)} stroke="#9cabbc"/>
   {chart==="line"&&<polyline points={data.map((row,i)=>x(i)+","+y(row.value)).join(" ")} fill="none" stroke="#54d5f4" strokeWidth="3"/>}
   {data.map((row,i)=><g key={row.id}><title>{row.label+": "+format(row.value)}</title>{chart==="line"?<circle cx={x(i)} cy={y(row.value)} r="4" fill="#54d5f4"/>:<rect x={x(i)-Math.min(40,240/data.length)} y={Math.min(y(0),y(row.value))} width={Math.min(80,480/data.length)} height={Math.max(1,Math.abs(y(0)-y(row.value)))} fill={row.value<0?"#ff7e7e":"#339cff"}/>} {(i%Math.max(1,Math.ceil(data.length/8))===0||i===data.length-1)&&<text x={x(i)} y="280" transform={"rotate(20 "+x(i)+" 280)"} textAnchor="middle" fill="#d8e8f6" fontSize="11">{row.label.slice(0,16)}</text>}</g>)}
  </>}
 </svg></div>;
}
