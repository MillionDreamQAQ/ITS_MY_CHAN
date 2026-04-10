import dayjs from "dayjs";

// A股交易时段边界（分钟数，从00:00起算）
const MORNING_START = 9 * 60 + 30; // 09:30
const MORNING_END = 11 * 60 + 30; // 11:30
const AFTERNOON_START = 13 * 60; // 13:00
const AFTERNOON_END = 15 * 60; // 15:00

function timeToMinutes(date) {
  return date.hour() * 60 + date.minute();
}

function applyMinutes(date, totalMinutes) {
  return date.hour(Math.floor(totalMinutes / 60)).minute(totalMinutes % 60);
}

/**
 * 生成某周期在某个交易时段内的所有有效K线时间点（分钟数）
 * @param {number} firstKline - 时段内第一根K线的时间（分钟数）
 * @param {number} lastKline - 时段内最后一根K线的时间（分钟数）
 * @param {number} step - 周期（分钟）
 * @returns {number[]}
 */
function generateSessionTimes(firstKline, lastKline, step) {
  const times = [];
  for (let t = firstKline; t <= lastKline; t += step) {
    times.push(t);
  }
  return times;
}

/**
 * 各周期的K线时间配置
 * morningFirst: 上午第一根K线时间
 * afternoonFirst: 下午第一根K线时间
 */
const KLINE_TIME_CONFIG = {
  1:  { morningFirst: 9 * 60 + 31,  afternoonFirst: 13 * 60 + 1 },
  5:  { morningFirst: 9 * 60 + 35,  afternoonFirst: 13 * 60 + 5 },
  15: { morningFirst: 9 * 60 + 45,  afternoonFirst: 13 * 60 + 15 },
  30: { morningFirst: 9 * 60 + 30,  afternoonFirst: 13 * 60 + 30 },
  60: { morningFirst: 10 * 60 + 30, afternoonFirst: 14 * 60 },
};

/**
 * 获取某周期一天中所有有效K线时间点（分钟数）
 */
function getValidTimes(stepMinutes) {
  const config = KLINE_TIME_CONFIG[stepMinutes];
  if (!config) return [];

  const morning = generateSessionTimes(config.morningFirst, MORNING_END, stepMinutes);
  const afternoon = generateSessionTimes(config.afternoonFirst, AFTERNOON_END, stepMinutes);
  return [...morning, ...afternoon];
}

/**
 * 在有效时间数组中找到 >= mins 的下一个时间点，超出则返回 null
 */
function findNextTime(validTimes, mins) {
  for (let i = 0; i < validTimes.length; i++) {
    if (validTimes[i] >= mins) return validTimes[i];
  }
  return null;
}

/**
 * 在有效时间数组中找到 <= mins 的上一个时间点，超出则返回 null
 */
function findPrevTime(validTimes, mins) {
  for (let i = validTimes.length - 1; i >= 0; i--) {
    if (validTimes[i] <= mins) return validTimes[i];
  }
  return null;
}

/**
 * 在交易日列表中查找下一个交易日
 */
function findNextTradingDay(tradingDates, currentDateStr) {
  const idx = tradingDates.indexOf(currentDateStr);
  if (idx >= 0 && idx < tradingDates.length - 1) {
    return tradingDates[idx + 1];
  }
  let lo = 0;
  let hi = tradingDates.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (tradingDates[mid] <= currentDateStr) {
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return lo < tradingDates.length ? tradingDates[lo] : null;
}

/**
 * 在交易日列表中查找上一个交易日
 */
function findPrevTradingDay(tradingDates, currentDateStr) {
  const idx = tradingDates.indexOf(currentDateStr);
  if (idx > 0) {
    return tradingDates[idx - 1];
  }
  let lo = 0;
  let hi = tradingDates.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (tradingDates[mid] < currentDateStr) {
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return hi >= 0 ? tradingDates[hi] : null;
}

/**
 * 向前偏移一根K线（正向）
 */
function shiftForwardOne(current, stepMinutes, tradingDates) {
  const next = current.add(stepMinutes, "minute");
  const mins = timeToMinutes(next);
  const dateStr = next.format("YYYY-MM-DD");
  const validTimes = getValidTimes(stepMinutes);

  // 找到下一个有效K线时间点
  const snapped = findNextTime(validTimes, mins);
  if (snapped !== null) {
    return applyMinutes(next, snapped);
  }

  // 超过当天收盘，跳到下一个交易日的第一个K线时间
  const nextDay = findNextTradingDay(tradingDates, dateStr);
  if (!nextDay) return null;
  const firstTime = validTimes[0]; // 下一个交易日的第一根K线
  return dayjs(nextDay).hour(Math.floor(firstTime / 60)).minute(firstTime % 60);
}

/**
 * 向后偏移一根K线（反向）
 */
function shiftBackwardOne(current, stepMinutes, tradingDates) {
  const prev = current.subtract(stepMinutes, "minute");
  const mins = timeToMinutes(prev);
  const dateStr = prev.format("YYYY-MM-DD");
  const validTimes = getValidTimes(stepMinutes);

  // 找到上一个有效K线时间点
  const snapped = findPrevTime(validTimes, mins);
  if (snapped !== null) {
    return applyMinutes(prev, snapped);
  }

  // 早于当天开盘，跳到上一个交易日的最后一个K线时间
  const prevDay = findPrevTradingDay(tradingDates, dateStr);
  if (!prevDay) return null;
  const lastTime = validTimes[validTimes.length - 1]; // 上一个交易日的最后一根K线
  return dayjs(prevDay).hour(Math.floor(lastTime / 60)).minute(lastTime % 60);
}

/**
 * 回放模式时间偏移（核心函数）
 * @param {string} replayDate - 当前回放时间 "YYYY-MM-DD HH:mm"
 * @param {number} offset - 偏移量（正=向后，负=向前）
 * @param {number} stepMinutes - K线周期（分钟）
 * @param {string[]} tradingDates - 交易日列表
 * @returns {string|null} 新的回放时间
 */
export function shiftReplayTime(replayDate, offset, stepMinutes, tradingDates) {
  if (!replayDate || !tradingDates || tradingDates.length === 0) return null;

  let current = dayjs(replayDate);

  if (offset > 0) {
    for (let i = 0; i < offset; i++) {
      current = shiftForwardOne(current, stepMinutes, tradingDates);
      if (!current) return null;
    }
  } else {
    for (let i = 0; i < -offset; i++) {
      current = shiftBackwardOne(current, stepMinutes, tradingDates);
      if (!current) return null;
    }
  }

  return current.format("YYYY-MM-DD HH:mm");
}
