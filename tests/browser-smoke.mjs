import fs from 'node:fs';

const endpoint = process.argv.find(arg => arg.startsWith('http://127.0.0.1:')) || 'http://127.0.0.1:9222';
const pages = await fetch(`${endpoint}/json`).then(response => response.json());
const page = pages.find(item => item.type === 'page');
if (!page) throw new Error('No browser page found');

const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once:true }); socket.addEventListener('error', reject, { once:true }); });
let sequence = 0;
const pending = new Map();
const exceptions = [];
socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails.text);
    if (message.id && pending.has(message.id)) { const { resolve, reject } = pending.get(message.id); pending.delete(message.id); message.error ? reject(new Error(message.error.message)) : resolve(message.result); }
});
const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++sequence; pending.set(id,{resolve,reject}); socket.send(JSON.stringify({id,method,params})); });
const evaluate = async expression => {
    const result = await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
};
const wait = ms => new Promise(resolve => setTimeout(resolve,ms));

await send('Runtime.enable');
await send('Page.enable');
await send('Page.navigate',{url:'http://localhost:3000'});
await wait(1200);
await evaluate(`document.getElementById('input-name').value='テスト'; Game.selectType('str'); Game.start(); true`);
await wait(700);
if (process.argv.includes('--training-shot')) {
    const shot = await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    fs.writeFileSync('training-screen.png',Buffer.from(shot.data,'base64'));
}
const trainingBefore = await evaluate(`Number(document.getElementById('stat-str').textContent)`);
await evaluate(`(()=>{const original=Math.random;Math.random=()=>0;Game.tryAction('str');Game.tryAction('str');Math.random=original;return true})()`);
await wait(1300);
const trainingAfter = await evaluate(`({stat:Number(document.getElementById('stat-str').textContent),draft:!document.getElementById('scene-draft').classList.contains('hidden'),choices:document.getElementById('draft-container').children.length})`);
if (!trainingAfter.draft || trainingAfter.choices < 3 || trainingAfter.stat - trainingBefore < 4) throw new Error(`Great-success training failed: ${JSON.stringify(trainingAfter)}`);
await evaluate(`Game.skipDraft(); true`);
await evaluate(`{ for(let i=0;i<9;i++) Game.advanceTurn(); true }`);
await wait(1900);
const battle = await evaluate(`({
    visible: !document.getElementById('scene-battle').classList.contains('hidden'),
    enemy: document.getElementById('enemy-name').textContent,
    enemyHp: document.getElementById('enemy-hp-text').textContent,
    level: document.getElementById('enemy-level').textContent,
    hand: document.getElementById('hand-container').children.length,
    arena: getComputedStyle(document.getElementById('scene-battle')).getPropertyValue('--arena-accent').trim()
})`);
if (!battle.visible || !battle.enemy || battle.hand < 1 || !battle.arena) throw new Error(`Battle did not initialize: ${JSON.stringify(battle)}`);
const randomName = battle.enemy.replace(/^(猛き|妖しき|鉄壁の|覇王)/,'').replace(/っち$/,'');
if ([...randomName].length < 1 || [...randomName].length > 4 || randomName.includes('っ')) throw new Error(`Invalid enemy name: ${battle.enemy}`);

const hpBefore = Number((battle.enemyHp || '').split('/')[0]);
await evaluate(`(Array.from(document.querySelectorAll('#hand-container > div')).find(el=>el.className.includes('border-red')) || document.querySelector('#hand-container > div'))?.click(); true`);
await wait(80);
await evaluate(`document.querySelector('#hand-container > .card-selected')?.click(); true`);
await wait(1300);
const afterCard = await evaluate(`({ hp:document.getElementById('enemy-hp-text').textContent, hand:document.getElementById('hand-container').children.length, fx:document.getElementById('battle-fx-layer').children.length })`);
if (Number(afterCard.hp.split('/')[0]) >= hpBefore) throw new Error(`Offensive card did not damage enemy: ${battle.enemyHp} -> ${afterCard.hp}`);
await evaluate(`document.getElementById('enemy-sprite').classList.add('victory-burst'); Game.spawnEnemy(); true`);
await wait(180);
const respawn = await evaluate(`(()=>{const el=document.getElementById('enemy-sprite'),rect=el.getBoundingClientRect(),style=getComputedStyle(el);return {width:rect.width,height:rect.height,opacity:Number(style.opacity),visibility:style.visibility}})()`);
if (respawn.width < 10 || respawn.height < 10 || respawn.opacity <= 0 || respawn.visibility !== 'visible') throw new Error(`Enemy disappeared after respawn: ${JSON.stringify(respawn)}`);
await evaluate(`Game.showJourneyEvent(); true`);
await wait(760);
const journey = await evaluate(`({visible:!document.getElementById('scene-event').classList.contains('hidden'),choices:document.getElementById('event-choice-container').children.length})`);
if (!journey.visible || journey.choices !== 3) throw new Error(`Journey event failed: ${JSON.stringify(journey)}`);
await evaluate(`Game.gameOver(); true`);
await wait(760);
const retry = await evaluate(`({visible:!document.getElementById('scene-result').classList.contains('hidden'),upgrades:document.getElementById('meta-upgrade-grid').children.length,earned:document.getElementById('result-shards-earned').textContent})`);
if (!retry.visible || retry.upgrades !== 4 || !retry.earned.includes('+')) throw new Error(`Retry progression failed: ${JSON.stringify(retry)}`);
if (exceptions.length) throw new Error(`Browser exceptions: ${exceptions.join(' | ')}`);
if (process.argv.includes('--screenshot')) {
    const shot = await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    fs.writeFileSync('battle-screen.png',Buffer.from(shot.data,'base64'));
}
console.log(`Browser smoke passed: ${battle.enemy} ${battle.level}, hand ${battle.hand}, event choices ${journey.choices}, retry upgrades ${retry.upgrades}.`);
socket.close();
