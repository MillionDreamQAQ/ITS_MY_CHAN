import dayjs from "dayjs";

// A股交易时段（分钟数表示，从00:00起算）
const MORNING_START = 9 * 60 + 30; // 09:30
const MORNING_END = 11 * 60 + 30; // 11:30
const AFTERNOON_START = 13 * 60; // 13:00
const AFTERNOON_END = 15 * 60; // 15:00

function timeToMinutes(date) {
  return date.hour() * 60 + date.minute();
}

/**
 * 判断某时间是否在交易时段内
 */
function isInTradingSession(date) {
  const mins = timeToMinutes(date);
  return (
    (mins >= MORNING_START && mins <= MORNING_END) ||
    (mins >= AFTERNOON_START && mins <= AFTERNOON_END)
  );
}

/**
 * 在交易日列表中查找下一个交易日
 * @param {string[]} tradingDates - 交易日列表 ["2024-01-02", ...]
 * @param {string} currentDateStr - 当前日期 "YYYY-MM-DD"
 * @returns {string|null} 下一个交易日 "YYYY-MM-DD"
 */
function findNextTradingDay(tradingDates, currentDateStr) {
  const idx = tradingDates.indexOf(currentDateStr);
  if (idx >= 0 && idx < tradingDates.length - 1) {
    return tradingDates[idx + 1];
  }
  // 不在列表中（可能日期时间部分非交易日），二分查找
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
 * @param {string[]} tradingDates - 交易日列表
 * @param {string} currentDateStr - 当前日期 "YYYY-MM-DD"
 * @returns {string|null} 上一个交易日 "YYYY-MM-DD"
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
 * @param {dayjs.Dayjs} current - 当前时间
 * @param {number} stepMinutes - K线周期（分钟）
 * @param {string[]} tradingDates - 交易日列表
 * @returns {dayjs.Dayjs|null}
 */
function shiftForwardOne(current, stepMinutes, tradingDates) {
  let next = current.add(stepMinutes, "minute");
  const mins = timeToMinutes(next);
  const dateStr = next.format("YYYY-MM-DD");

  // 落在交易时段内，直接返回
  if (isInTradingSession(next)) {
    return next;
  }

  // 落在午休区间 (11:30 ~ 13:00) -> snap 到 13:00
  if (mins > MORNING_END && mins < AFTERNOON_START) {
    return next.hour(13).minute(0);
  }

  // 落在收盘后 (> 15:00) 或当天没有交易时段（如周末）-> 跳到下一个交易日 09:30
  if (mins > AFTERNOON_END) {
    const nextDay = findNextTradingDay(tradingDates, dateStr);
    if (!nextDay) return null;
    return dayjs(nextDay).hour(9).minute(30);
  }

  // 落在开盘前 (< 09:30) -> snap 到 09:30
  if (mins < MORNING_START) {
    return next.hour(9).minute(30);
  }

  return next;
}

/**
 * 向后偏移一根K线（反向）
 * @param {dayjs.Dayjs} current - 当前时间
 * @param {number} stepMinutes - K线周期（分钟）
 * @param {string[]} tradingDates - 交易日列表
 * @returns {dayjs.Dayjs|null}
 */
function shiftBackwardOne(current, stepMinutes, tradingDates) {
  let prev = current.subtract(stepMinutes, "minute");
  const mins = timeToMinutes(prev);
  const dateStr = prev.format("YYYY-MM-DD");

  // 落在交易时段内，直接返回
  if (isInTradingSession(prev)) {
    return prev;
  }

  // 落在午休区间 (11:30 ~ 13:00) -> snap 到 11:30
  if (mins > MORNING_END && mins < AFTERNOON_START) {
    return prev.hour(11).minute(30);
  }

  // 落在开盘前 (< 09:30) -> 跳到上一个交易日 15:00
  if (mins < MORNING_START) {
    const prevDay = findPrevTradingDay(tradingDates, dateStr);
    if (!prevDay) return null;
    return dayjs(prevDay).hour(15).minute(0);
  }

  // 落在收盘后 (> 15:00) -> snap 到 15:00
  if (mins > AFTERNOON_END) {
    return prev.hour(15).minute(0);
  }

  return prev;
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
