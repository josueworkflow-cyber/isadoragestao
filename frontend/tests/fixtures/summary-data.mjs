// Synthetic local data only. No production database is used by these tests.
const keys = ['solisnando','samuel','celso','gregorio','jairo','fabio','ernido','tiago','pablo','elberto'];
const names = ['Solisnando','Samuel','Celso','Gregório','Jairo','Fábio','Ernido','Tiago','Pablo','Elberto'];
const colors = ['#2563eb','#7c3aed','#0891b2','#059669','#d97706','#e11d48','#0f766e','#9333ea','#f59e0b','#b45309'];
const january = [10000,20000,5000,18000,12000,7000,15000,2000,8000,3000];
const february = [15000,8000,14000,10000,21000,13000,10000,4000,5000,0];
const march = [20000,30000,10000,15000,25000,10000,12000,3000,15000,0];
const factoryKeys = ['pian','nutri','erva','mek','outros'];
const weights = [0.5,0.25,0.15,0.1,0];
export function createSummaryFixture() {
    const data = { D: {}, VND_LIST: [] };
    keys.forEach((key, index) => {
        data.VND_LIST.push({ k:key,l:names[index],c:colors[index],active:key !== 'tiago',pj:20,pf:25,pm:30 });
        const target = key === 'elberto' ? 0 : key === 'tiago' ? 24000 : 120000;
        const total = { jan:january[index],fev:february[index],mar:march[index],ma:target };
        data.D[key] = { total };
        factoryKeys.forEach((factory, f) => {
            data.D[key][factory] = { jan:total.jan*weights[f],fev:total.fev*weights[f],mar:total.mar*weights[f],ma:target*weights[f] };
        });
    });
    return data;
}
