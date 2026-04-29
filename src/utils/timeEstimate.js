// Shared time estimation utility used by Assessment.jsx (Dentify screen) and QuoteGeneration.jsx

const TIME_RANGES = {
  dent: {
    'up_to_10':  { good: [15, 30], limited: [25, 45], no_access: [30, 60] },
    '11_25':     { good: [20, 40], limited: [35, 60], no_access: [45, 75] },
    '26_50':     { good: [30, 60], limited: [50, 90], no_access: [60, 120] },
    '51_80':     { good: [45, 90], limited: [75, 120], no_access: [90, 150] },
    '81_120':    { good: [60, 120], limited: [90, 150], no_access: [120, 180] },
    '121_200':   { good: [90, 150], limited: [120, 180], no_access: [150, 240] },
    '201_300':   { good: [120, 180], limited: [150, 210], no_access: [180, 270] },
    '301_plus':  { good: [150, 240], limited: [180, 270], no_access: [210, 300] },
  },
  crease: {
    'up_to_25':  { good: [30, 60], limited: [45, 90], no_access: [60, 120] },
    '26_80':     { good: [60, 120], limited: [90, 150], no_access: [120, 180] },
    '81_200':    { good: [90, 150], limited: [120, 180], no_access: [150, 240] },
    '201_plus':  { good: [120, 200], limited: [150, 240], no_access: [180, 300] },
  }
};

function getSizeCategory(sizeRange, isCrease) {
  const s = (sizeRange || '').toLowerCase();
  const nums = s.match(/\d+/g);
  let size = 50;
  if (nums && nums.length >= 2) size = parseInt(nums[1]);
  else if (nums && nums.length === 1) size = parseInt(nums[0]);
  if (s.includes('301') || (nums && parseInt(nums[0]) >= 301 && !isCrease)) return '301_plus';
  if (s.includes('201') && !isCrease && size <= 300) return '201_300';
  if (isCrease) {
    if (size <= 25) return 'up_to_25';
    if (size <= 80) return '26_80';
    if (size <= 200) return '81_200';
    return '201_plus';
  } else {
    if (size <= 10) return 'up_to_10';
    if (size <= 25) return '11_25';
    if (size <= 50) return '26_50';
    if (size <= 80) return '51_80';
    if (size <= 120) return '81_120';
    if (size <= 200) return '121_200';
    if (size <= 300) return '201_300';
    return '301_plus';
  }
}

function getAccessCategory(repairMethod) {
  if (!repairMethod) return 'good';
  const m = repairMethod.toLowerCase();
  if (m.includes('limited')) return 'limited';
  if (m.includes('glue') || m.includes('no access') || m.includes('strip')) return 'no_access';
  return 'good';
}

function calculateTimeModifiers(damageItem) {
  let modifier = 0;
  const depth = (damageItem.depth || '').toLowerCase();
  if (depth.includes('medium')) modifier += 15;
  if (depth.includes('deep') || depth.includes('sharp')) modifier += 30;
  if (damageItem.affects_body_line) modifier += 20;
  if (damageItem.has_stretched_metal) modifier += 20;
  if (damageItem.material === 'Aluminum') modifier += 15;
  return modifier;
}

function roundToNearest5(mins) {
  return Math.round(mins / 5) * 5;
}

function formatTimeRange(minMins, maxMins) {
  const formatSingle = (m) => {
    if (m < 60) return `${m} mins`;
    const hrs = Math.floor(m / 60);
    const mins = m % 60;
    if (mins === 0) return `${hrs} hr${hrs !== 1 ? 's' : ''}`;
    return `${hrs} hr${hrs !== 1 ? 's' : ''} ${mins} mins`;
  };
  return `${formatSingle(minMins)} \u2013 ${formatSingle(maxMins)}`;
}

export function calculateEstimatedTimeRange(damageItems) {
  if (!damageItems || damageItems.length === 0) return null;
  let totalMin = 0;
  let totalMax = 0;
  for (const item of damageItems) {
    const isCrease = (item.damage_type || '').toLowerCase() === 'crease';
    const typeKey = isCrease ? 'crease' : 'dent';
    const sizeKey = getSizeCategory(item.size_range, isCrease);
    const accessKey = getAccessCategory(item.repair_method);
    const ranges = TIME_RANGES[typeKey];
    const baseRange = (ranges[sizeKey] || ranges[Object.keys(ranges)[0]])[accessKey] || [30, 60];
    const modifier = calculateTimeModifiers(item);
    totalMin += roundToNearest5(baseRange[0] + modifier);
    totalMax += roundToNearest5(baseRange[1] + modifier);
  }
  return formatTimeRange(totalMin, totalMax);
}