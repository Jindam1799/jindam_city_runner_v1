/* 🛂 검문소 2.0 — 매번 새로 만들어지는 여행객 · 서류 2장(通行证 + 车票) · 중국어로 묻는 심문 · 교대 시계
   과마다 SPEC: 통행 규칙이 걸린 칸(main), 다른 칸들, 질문(field에 대한 대답), 훔친 말을 끌어내는 '특별 질문'
   단원은 훔친 말을 못 해요 → 특별 질문에 "那个……"로 얼버무려요. */
const TODAY = { zh: '10月29日', ko: '10월 29일' }, YESTERDAY = { zh: '10月28日', ko: '10월 28일' };
const NAMES = ['王小明', '李华', '张伟', '刘洋', '陈静', '杨帆', '赵磊', '黄丽', '周杰', '吴芳', '孙涛', '马丽', '郑浩', '冯雪', '何平', '林琳'];
const OTHER_CITY = ['北京|베이징', '上海|상하이', '广州|광저우', '西安|시안', '深圳|선전'];
const SPEC = {
  1: {
    city: '重庆|충칭',
    main: { key: '坐', label: '교통', ok: ['轻轨|경전철'], bad: ['地铁|지하철', '出租车|택시', '公交车|버스'],
      rule: ['坐轻轨来的人，可以通过。', 'Zuò qīngguǐ lái de rén, kěyǐ tōngguò.', '경전철을 타고 온 사람만 통과!'] },
    fields: { 住: { label: '사는 층', vals: ['八楼|8층', '十二楼|12층', '十五楼|15층', '十九楼|19층', '二十楼|20층'] }, 从: { label: '어디에서', vals: ['李子坝|리쯔바', '解放碑|해방비', '洪崖洞|훙야둥'] } },
    qs: [
      { f: '坐', q: ['你坐什么来的？', 'Nǐ zuò shénme lái de?', '뭐 타고 왔어요?'], a: (z, k) => [`我坐${z}来的。`, `${k} 타고 왔어요.`] },
      { f: '住', q: ['你住在几楼？', 'Nǐ zhù zài jǐ lóu?', '몇 층에 살아요?'], a: (z, k) => [`我住在${z}。`, `${k}에 살아요.`] },
      { f: '从', q: ['你从哪儿来？', 'Nǐ cóng nǎr lái?', '어디에서 왔어요?'], a: (z, k) => [`我从${z}来。`, `${k}에서 왔어요.`] }
    ],
    special: { q: ['你看见轻轨了吗？', 'Nǐ kànjiàn qīngguǐ le ma?', '경전철 봤어요?'], good: ['看见了！轻轨从楼里穿过去了！', '봤어요! 경전철이 건물을 뚫고 지나갔어요!'], bad: ['看见了……轻轨从楼里……那个……那个……过去了。', '봤어요… 경전철이 건물을… 그… 그… 지나갔어요.'], word: '穿过去' }
  },
  2: {
    city: '成都|청두',
    main: { key: '时间', label: '언제', ok: ['周末|주말'], bad: ['星期一|월요일', '星期三|수요일', '星期五|금요일'],
      rule: ['周末来的人，可以通过。', 'Zhōumò lái de rén, kěyǐ tōngguò.', '주말에 온 사람만 통과!'] },
    fields: { 去: { label: '어디로', vals: ['茶馆|찻집', '公园|공원', '火锅店|훠궈집'] }, 从: { label: '어디에서', vals: ['宽窄巷子|콴자이샹쯔', '春熙路|춘시루', '人民公园|인민공원'] } },
    qs: [
      { f: '时间', q: ['你什么时候来的？', 'Nǐ shénme shíhou lái de?', '언제 왔어요?'], a: (z, k) => [`我${z}来的。`, `${k}에 왔어요.`] },
      { f: '去', q: ['你要去哪儿？', 'Nǐ yào qù nǎr?', '어디 가요?'], a: (z, k) => [`我要去${z}。`, `${k}에 가요.`] },
      { f: '从', q: ['你从哪儿来？', 'Nǐ cóng nǎr lái?', '어디에서 왔어요?'], a: (z, k) => [`我从${z}来。`, `${k}에서 왔어요.`] }
    ],
    special: { q: ['你喜欢慢慢来吗？', 'Nǐ xǐhuan mànmàn lái ma?', '천천히 하는 거 좋아해요?'], good: ['喜欢！一边喝茶，一边聊天。慢慢来！', '좋아요! 차 마시면서 수다 떨고. 천천히!'], bad: ['快点儿！快点儿！慢……那个……我很忙！', '빨리! 빨리! 천… 그… 나 바빠요!'], word: '慢慢来' }
  },
  3: {
    city: '昆明|쿤밍',
    main: { key: '带', label: '가진 것', ok: ['新鲜的花|신선한 꽃'], bad: ['假花|가짜 꽃', '干花|마른 꽃'],
      rule: ['带新鲜的花的人，可以通过。', 'Dài xīnxiān de huā de rén, kěyǐ tōngguò.', '신선한 꽃을 가진 사람만 통과!'] },
    fields: { 颜色: { label: '꽃 색깔', vals: ['红色|빨간색', '黄色|노란색', '白色|흰색', '粉色|분홍색'] }, 从: { label: '어디에서', vals: ['花市|꽃시장', '翠湖|추이후', '老街|라오제'] } },
    qs: [
      { f: '带', q: ['你带了什么？', 'Nǐ dài le shénme?', '뭐 가지고 왔어요?'], a: (z, k) => [`我带了${z}。`, `${k}을 가져왔어요.`] },
      { f: '颜色', q: ['你的花是什么颜色的？', 'Nǐ de huā shì shénme yánsè de?', '꽃이 무슨 색이에요?'], a: (z, k) => [`是${z}的。`, `${k}이에요.`] },
      { f: '从', q: ['你从哪儿来？', 'Nǐ cóng nǎr lái?', '어디에서 왔어요?'], a: (z, k) => [`我从${z}来。`, `${k}에서 왔어요.`] }
    ],
    special: { q: ['鲜花饼怎么样？', 'Xiānhuābǐng zěnmeyàng?', '꽃빵 어때요?'], good: ['又香又甜！是用玫瑰花做的。', '향기롭고 달아요! 장미로 만들었어요.'], bad: ['又……那个……又辣又咸！', '그… 그… 맵고 짜요!'], word: '又香又甜' }
  },
  4: {
    city: '哈尔滨|하얼빈',
    main: { key: '穿', label: '옷', ok: ['厚衣服|두꺼운 옷', '羽绒服|패딩'], bad: ['T恤|티셔츠', '短裤|반바지'],
      rule: ['穿厚衣服的人，可以出去。', 'Chuān hòu yīfu de rén, kěyǐ chūqu.', '두꺼운 옷을 입은 사람만 나가요!'] },
    fields: { 从: { label: '어디에서', vals: ['中央大街|중앙대가', '冰雪大世界|빙설대세계', '松花江|쑹화강'] }, 去: { label: '어디로', vals: ['冰雪大世界|빙설대세계', '索菲亚教堂|성소피아 성당'] } },
    qs: [
      { f: '穿', q: ['你穿了什么？', 'Nǐ chuān le shénme?', '뭐 입었어요?'], a: (z, k) => [`我穿了${z}。`, `${k}을 입었어요.`] },
      { f: '从', q: ['你从哪儿来？', 'Nǐ cóng nǎr lái?', '어디에서 왔어요?'], a: (z, k) => [`我从${z}来。`, `${k}에서 왔어요.`] },
      { f: '去', q: ['你要去哪儿？', 'Nǐ yào qù nǎr?', '어디 가요?'], a: (z, k) => [`我要去${z}。`, `${k}에 가요.`] }
    ],
    special: { q: ['外面冷吗？', 'Wàimian lěng ma?', '밖에 추워요?'], good: ['冷死了！零下三十度！', '추워 죽겠어요! 영하 30도예요!'], bad: ['好热……那个……不冷！一点儿也不冷！', '덥… 그… 안 추워요! 하나도!'], word: '冷死了' }
  }
};
/* 목격 제보(생김새) 후보: 판마다 하나를 골라요 */
const TRAITS = [
  { key: 'hat', val: 'grey', rule: ['目击：小偷戴灰帽子。', 'Mùjī: xiǎotōu dài huī màozi.', '목격: 도둑은 회색 모자를 썼어요.'], wear: '戴灰帽子|회색 모자', near: [['hat', 'red', '戴红帽子|빨간 모자'], ['hat', 'blue', '戴蓝帽子|파란 모자']], item: '灰帽子|회색 모자' },
  { key: 'scarf', val: '#e2504c', rule: ['目击：小偷围红围巾。', 'Mùjī: xiǎotōu wéi hóng wéijīn.', '목격: 도둑은 빨간 목도리를 했어요.'], wear: '围红围巾|빨간 목도리', near: [['scarf', '#3364a8', '围蓝围巾|파란 목도리'], ['scarf', '#f2c14e', '围黄围巾|노란 목도리']], item: '红围巾|빨간 목도리' },
  { key: 'glasses', val: 'sun', rule: ['目击：小偷戴黑眼镜。', 'Mùjī: xiǎotōu dài hēi yǎnjìng.', '목격: 도둑은 까만 선글라스를 썼어요.'], wear: '戴黑眼镜|까만 선글라스', near: [['glasses', 'thin', '戴眼镜|투명 안경']], item: '黑眼镜|선글라스' },
  { key: 'coat', val: '#2a2430', rule: ['目击：小偷穿黑衣服。', 'Mùjī: xiǎotōu chuān hēi yīfu.', '목격: 도둑은 검은 옷을 입었어요.'], wear: '穿黑衣服|검은 옷', near: [['coat', '#6a6a74', '穿灰衣服|회색 옷']], item: '黑衣服|검은 옷' }
];
const BAG_POOL = ['手机|휴대폰', '车票|기차표', '雨伞|우산', '书|책', '水|물', '地图|지도', '钱包|지갑', '相机|카메라', '面包|빵', '钥匙|열쇠'];
const HATC = { grey: ['#8a8a96', '#5a5a66'], red: ['#c0392b', '#7a2a24'], blue: ['#3364a8', '#1f3566'] };

/* 한 교대(shift)의 여행객 만들기 */
function makeShift(no) {
  const sp = SPEC[no], trait = pick(TRAITS);
  const roles = shuffle(['honest', 'honest', 'near', 'rule', 'liar', 'ticket', 'gang']).concat(['boss']);
  const names = shuffle(NAMES);
  const city = sp.city.split('|');
  const ppl = roles.map((role, i) => {
    const base = pick(['uncle', 'auntie', 'grandpa', 'student']);
    const doc = {}; doc[sp.main.key] = role === 'rule' ? pick(sp.main.bad) : pick(sp.main.ok);
    Object.entries(sp.fields).forEach(([k, f]) => doc[k] = pick(f.vals));
    const ticket = { 到: sp.city, 日期: `${TODAY.zh}|${TODAY.ko}` };
    if (role === 'ticket') { if (Math.random() < .5) ticket.到 = pick(OTHER_CITY); else ticket.日期 = `${YESTERDAY.zh}|${YESTERDAY.ko}`; }
    // 생김새
    const acc = {}; let wear = '';
    if (role === 'gang') { acc[trait.key] = trait.val; wear = trait.wear; }
    else if (role === 'near') { const n = pick(trait.near); acc[n[0]] = n[1]; wear = n[2]; }
    else if (Math.random() < .4) { const t2 = pick(TRAITS.filter(t => t !== trait)); acc[t2.key] = t2.val; wear = t2.wear; }
    // 대답: liar는 질문 하나에서 서류와 다른 대답
    const answers = {};
    let lieField = null;
    if (role === 'liar') { const q = pick(sp.qs.filter(q => q.f !== sp.main.key)); lieField = q.f; }
    sp.qs.forEach(q => {
      let v = doc[q.f];
      if (q.f === lieField) { const pool = (sp.fields[q.f] || sp.main).vals || sp.main.ok.concat(sp.main.bad); v = pick(pool.filter(x => x !== doc[q.f])); }
      answers[q.f] = v;
    });
    const bag = shuffle(BAG_POOL).slice(0, 2);
    if (role === 'boss') bag.splice(1, 1, trait.item, '嘘纸条|"嘘" 쪽지');
    return { role, n: names[i], base, acc, wear: wear || '没有特别的|특별한 점 없음', doc, ticket, answers, lieField, bag, ok: ['honest', 'near'].includes(role) };
  });
  return { sp, trait, ppl, rules: [sp.main.rule, ['说的话和通行证要一样。', 'Shuō de huà hé tōngxíngzhèng yào yíyàng.', '대답이 통행증과 같아야 해요. (질문해 봐요!)'], [`车票：到${city[0]}，日期是今天。`, `Chēpiào: dào ${city[0]}, rìqī shì jīntiān.`, `차표: 목적지 ${city[1]}, 날짜는 오늘(${TODAY.ko})!`], trait.rule, [`小偷说不出"${sp.special.word}"。`, '', `도둑은 훔친 말 "${sp.special.word}"를 못 해요. 특별 질문으로 확인!`]] };
}
/* 해설 */
function whyOf(p, S) {
  const sp = S.sp, v = x => (x || '').split('|');
  if (p.role === 'honest') return '서류도 대답도 모두 맞아요. 통과!';
  if (p.role === 'near') return `${v(p.wear)[1]}예요. 목격된 건 ${v(S.trait.wear)[1]}! 헷갈리게 생겼지만 통과!`;
  if (p.role === 'rule') return `${sp.main.label}: ${v(p.doc[sp.main.key])[0]}(${v(p.doc[sp.main.key])[1]}). 규칙 위반이에요!`;
  if (p.role === 'ticket') return p.ticket.到 !== sp.city ? `차표 목적지가 ${v(p.ticket.到)[1]}예요. 이 도시가 아니에요!` : `차표 날짜가 어제(${YESTERDAY.ko})예요!`;
  if (p.role === 'liar') { const f = p.lieField, lab = (sp.fields[f] || {}).label || f; return `${lab}: 통행증은 ${v(p.doc[f])[0]}인데 대답은 ${v(p.answers[f])[0]}! 거짓말이에요.`; }
  if (p.role === 'gang') return `${v(S.trait.wear)[1]}! 목격 제보와 같아요. 무음단 졸개!`;
  if (p.role === 'boss') return `특별 질문에 "那个……"로 얼버무렸어요. "${sp.special.word}"를 못 하는 변장한 무음단 단원!`;
  return '';
}
function shiftLook(no, i, p) {
  const over = {}, a = p.acc;
  if (a.hat) { over.hatc = HATC[a.hat][0]; over.hatb = HATC[a.hat][1]; }
  if (a.glasses) over.glasses = a.glasses;
  if (a.scarf) { over.scarf = a.scarf; over.scarfD = a.scarf; }
  if (a.coat) { over.coat = a.coat; over.coatD = a.coat; over.coatL = a.coat; }
  return PX.addLook(`sh${no}_${i}`, p.base, over);
}
