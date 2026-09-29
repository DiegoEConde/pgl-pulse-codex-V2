import type { Slice } from "@/lib/reports";
import styles from "./ReportsScreen.module.css";
export const pieColors=["#339cff","#54d5f4","#56d6a3","#9386ff","#f1bd65","#ff7e7e","#ed91ce","#91b84e","#5da4c8","#c5a27b"];
export default function ReportPie({data}:{data:Slice[]}) {
 const total=data.reduce((s,r)=>s+r.value,0);
 if(!total)return <div className={styles.empty}>Sin movimientos en este período.</div>;

 return <div className={styles.pieLayout}>
  <svg viewBox="0 0 200 200" role="img" aria-label={"Distribución de "+total+" unidades"} className={styles.pie}>
   {/* SVG requiere un círculo completo cuando hay una única categoría. */}
   {data.map((r,i)=>{const start=data.slice(0,i).reduce((sum,item)=>sum+item.value,0)/total*Math.PI*2;const angle=start+r.value/total*Math.PI*2;const x1=100+94*Math.cos(start),y1=100+94*Math.sin(start),x2=100+94*Math.cos(angle),y2=100+94*Math.sin(angle);
    return r.value===total?<circle key={r.id} cx="100" cy="100" r="94" fill={pieColors[i%pieColors.length]}><title>{r.label}: {r.value}</title></circle>:<path key={r.id} d={`M100,100 L${x1},${y1} A94,94 0 ${angle-start>Math.PI?1:0},1 ${x2},${y2} Z`} fill={pieColors[i%pieColors.length]} stroke="#101922" strokeWidth="1"><title>{r.label}: {r.value} ({(r.value/total*100).toFixed(1)}%)</title></path>;
   })}
  </svg>
  <ul className={styles.legend}>{data.map((r,i)=><li key={r.id}><i style={{background:pieColors[i%pieColors.length]}}/><span title={r.label}>{r.label}</span><b>{r.value}</b><small>{(r.value/total*100).toFixed(0)}%</small></li>)}</ul>
 </div>;
}
