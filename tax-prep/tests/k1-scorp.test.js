// Run: node tax-prep/tests/k1-scorp.test.js  (QA regressions: SE wage base, S-corp QBI wage limit, excess SS credit)
const T=require('../js/tax2026.js');
const S=require('../js/scorp.js');
let f=0; const ck=(n,ok,i)=>{if(!ok)f++;console.log((ok?'PASS ':'FAIL ')+n+(ok?'':' :: '+i));};
// Schedule SE: a spouse's W-2 must not use up the owner's Social Security wage base
const r=T.estimate({status:'mfj',wages:184500,seIncome:100000});
ck('MFJ spouse wages do not cut owner SE tax', Math.abs(r.seTax-14130)<=1, 'seTax '+r.seTax);
// S-corp above the QBI threshold: the salary is W-2 wages for the 50% wage limit
const c=S.compare({status:'single',state:'TX',profit:400000,salary:200000,costs:3000});
ck('S-corp QBI uses W-2 wage limit', c.qbi.scorp>=36000, 'qbi '+c.qbi.scorp);
// two employers: excess employee SS is a refundable credit
const y=S.compare({status:'single',state:'TX',profit:200000,salary:100000,costs:2000,otherWages:150000});
ck('excess SS credit with another job', y.scorp.payrollTax < 15342-4000, 'payroll '+Math.round(y.scorp.payrollTax));
console.log(f?`${f} failing`:'all pass');
process.exit(f ? 1 : 0);
