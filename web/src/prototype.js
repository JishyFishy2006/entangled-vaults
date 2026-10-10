import { PASS_BAR, runLevel } from './quantum.js';

const $ = id => document.getElementById(id);
const PLAYERS = ['fire', 'water'];
const SIGNS = ['A', 'B'];
const SIGN_PAIRS = ['AA', 'AB', 'BA', 'BB'];

// Kept separately so switching modes doesn't lose either plan.
const dials = { fire: { A: 0, B: 2 }, water: { A: 1, B: 7 } };
const colors = { fire: { A: 'red', B: 'red' }, water: { A: 'red', B: 'red' } };
const pools = {};

function renderInputs() {
  const plain = $('mode').value === 'plain';
  for (const p of PLAYERS) {
    const fs = $(p);
    fs.querySelectorAll('label').forEach(el => el.remove());
    for (const s of SIGNS) {
      const label = document.createElement('label');
      label.textContent = `Sign ${s} `;
      const select = document.createElement('select');
      const options = plain ? ['red', 'blue'] : [0, 1, 2, 3, 4, 5, 6, 7];
      for (const v of options) {
        const opt = document.createElement('option');
        opt.value = v;
        opt.textContent = plain ? v : `${v} (${v * 45}°)`;
        select.append(opt);
      }
      const store = plain ? colors : dials;
      select.value = store[p][s];
      select.onchange = () => { store[p][s] = plain ? select.value : Number(select.value); };
      label.append(select);
      fs.append(label);
    }
  }
}

async function loadPool(mode) {
  if (mode === 'plain') return null;
  if (!pools[mode]) {
    const res = await fetch(`${import.meta.env.BASE_URL}pools/${mode}.json`);
    try {
      if (!res.ok) throw new Error();
      pools[mode] = await res.json();
    } catch {
      throw new Error(`pools/${mode}.json isn't available yet (the IonQ pool comes in Phase 3).`);
    }
  }
  return pools[mode];
}

async function run(times) {
  const mode = $('mode').value;
  const plan = mode === 'plain' ? colors : dials;
  let pool;
  try {
    pool = await loadPool(mode);
  } catch (err) {
    $('verdict').className = 'error';
    $('verdict').textContent = err.message;
    $('details').innerHTML = '';
    return;
  }

  if (times === 1) {
    const { wins, rounds, log } = runLevel(plan, pool, mode);
    const pass = wins >= PASS_BAR;
    $('verdict').className = pass ? 'pass' : 'fail';
    $('verdict').textContent =
      `${wins} / ${rounds} (${(wins / rounds * 100).toFixed(1)}%) — ${pass ? 'PASS: vault open' : 'FAIL'}`;
    const rows = SIGN_PAIRS.map(pair => {
      const rs = log.filter(r => r.fireSign + r.waterSign === pair);
      const w = rs.filter(r => r.won).length;
      const rate = rs.length ? (w / rs.length * 100).toFixed(1) + '%' : '–';
      return `<tr><td>${pair[0]}, ${pair[1]}</td><td>${w} / ${rs.length}</td><td>${rate}</td></tr>`;
    }).join('');
    $('details').innerHTML =
      `<p>Pass bar: ${PASS_BAR} wins. Best classical rate: 75%.</p>` +
      `<table><tr><th>Signs (Fire, Water)</th><th>Wins</th><th>Rate</th></tr>${rows}</table>`;
  } else {
    let passes = 0;
    let totalWins = 0;
    for (let i = 0; i < times; i++) {
      const { wins } = runLevel(plan, pool, mode);
      totalWins += wins;
      if (wins >= PASS_BAR) passes++;
    }
    $('verdict').className = passes > times / 2 ? 'pass' : 'fail';
    $('verdict').textContent = `Passed ${passes} of ${times} runs`;
    $('details').innerHTML =
      `<p>Average win rate: ${(totalWins / (times * 200) * 100).toFixed(1)}%. ` +
      `Pass bar: ${PASS_BAR} wins. Best classical rate: 75%.</p>`;
  }
}

$('mode').onchange = () => { renderInputs(); $('verdict').textContent = ''; $('details').innerHTML = ''; };
$('run').onclick = () => run(1);
$('run100').onclick = () => run(100);
renderInputs();
