// T.C. Kimlik No algoritması:
// 11 hane, ilk hane 0 olamaz,
// 10. hane = ((1+3+5+7+9. haneler) * 7 - (2+4+6+8. haneler)) mod 10,
// 11. hane = (ilk 10 hanenin toplamı) mod 10.

function kontrolHaneleri(ilk9) {
  const d = ilk9.split('').map(Number);
  const tek = d[0] + d[2] + d[4] + d[6] + d[8];
  const cift = d[1] + d[3] + d[5] + d[7];
  const h10 = (((tek * 7 - cift) % 10) + 10) % 10;
  const h11 = (d.reduce((a, b) => a + b, 0) + h10) % 10;
  return `${h10}${h11}`;
}

function gecerliMi(tcNo) {
  if (typeof tcNo !== 'string' || !/^[1-9]\d{10}$/.test(tcNo)) return false;
  return tcNo.slice(9) === kontrolHaneleri(tcNo.slice(0, 9));
}

// Seed ve testler için: 9 haneden geçerli bir TC no üretir.
function uret(ilk9) {
  return ilk9 + kontrolHaneleri(ilk9);
}

module.exports = { gecerliMi, uret };
