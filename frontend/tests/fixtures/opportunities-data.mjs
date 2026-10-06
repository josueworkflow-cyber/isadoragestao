import { createSummaryFixture } from './summary-data.mjs';
const client=(code,n,v,cd)=>({code,n,v,cd,ck:cd.toUpperCase().replace(/\s/g,''),a:v>2000?'A':v>500?'B':'C'});
export function createOpportunityFixture() {
    const data=createSummaryFixture();
    const eligible=data.VND_LIST.filter(v=>!['celso','tiago'].includes(v.k)).map(v=>v.k);
    data.OPPORTUNITY_COVERAGE={year:2026,months:[
        {key:'jul',endDate:'2026-07-31',vendors:eligible},
        {key:'ago',endDate:'2026-08-28',vendors:[...eligible,'celso']},
        {key:'set',endDate:'2026-10-02',vendors:eligible},
        {key:'out',endDate:'2026-10-30',vendors:eligible},
    ]};
    data.ABC_AGO={samuel:[],jairo:[],celso:[]};data.ABC_SET={samuel:[],jairo:[]};data.ABC_JUL={samuel:[]};data.ABC_OUT={samuel:[]};
    for(let index=1;index<=36;index++) {
        const code=`P${String(index).padStart(3,'0')}`;
        const name=`Pet Horizonte ${String(index).padStart(2,'0')}`;
        const value=2300+index*100;
        data.ABC_AGO.samuel.push(client(code,name,value,'Pelotas'));
        data.ABC_JUL.samuel.push(client(code,name,2100,'Pelotas'));
        if(index%3===0)data.ABC_SET.samuel.push(client(code,name,value,'Pelotas'));
        data.ABC_OUT.samuel.push(client(code,name,value+1000,'Pelotas'));
    }
    data.ABC_AGO.samuel.push(client('D01','Agro São João',5000,'Bagé'),client('A01','Pet Líder',6000,'Rio Grande'),client('T01','Cliente transferido',2800,'Pelotas'),client('N01','Razão social anterior',3000,'Pelotas'));
    data.ABC_SET.samuel.push(client('D01','Agro São João',2000,'Bagé'),client('A01','Pet Líder',6000,'Rio Grande'),client('N01','Razão social atualizada',3000,'Pelotas'),client('NEW01','Novo cliente',1500,'Bagé'));
    data.ABC_AGO.jairo.push(client('G01','Atacado Crescimento',1000,'Jaguarão'));
    data.ABC_SET.jairo.push(client('G01','Atacado Crescimento',300000,'Jaguarão'),client('T01','Cliente transferido',2800,'Pelotas'));
    data.ABC_AGO.celso.push(client('NO-IMPORT','Cliente com relatório pendente',9000,'Canguçu'));
    // Matching synthetic financial values for the local preview only.
    for(const month of ['jul','ago','set','out']) for(const vendor of data.VND_LIST) {
        const amount=(data[`ABC_${month.toUpperCase()}`][vendor.k] || []).reduce((sum,c)=>sum+c.v,0);
        data.D[vendor.k].total[month]=amount;
        ['pian','nutri','erva','mek','outros'].forEach((factory,index)=>data.D[vendor.k][factory][month]=amount*[0.5,0.25,0.15,0.1,0][index]);
    }
    return data;
}
