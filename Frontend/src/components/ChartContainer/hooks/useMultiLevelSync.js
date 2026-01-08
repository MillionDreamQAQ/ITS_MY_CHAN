import { useCallback, useEffect } from "react";

/**
 * 多级别图表同步Hook
 *
 * 核心功能：处理不同周期K线的时间映射和联动
 * - 十字线同步：当一个图表的十字线移动时，其他图表的十字线也移动到对应时间
 * - 缩放同步：当一个图表缩放时，其他图表也同步缩放到对应的时间范围
 *
 * @param {Object} chartRefs - 图表引用 Map
 * @param {Object} seriesRefs - 图表系列引用 Map
 * @param {Object} dataRefs - 图表数据引用 Map
 * @param {Array} chartsData - 图表数据数组（用于触发重新订阅）
 */
export const useMultiLevelSync = (chartRefs, seriesRefs, dataRefs, chartsData = []) => {
  /**
   * 在目标K线数据中查找与给定时间戳最接近的K线
   * 使用二分查找优化性能: O(log n)
   *
   * @param {Array} klineData - K线数据数组
   * @param {number} targetTime - 目标时间戳
   * @returns {Object|null} { index, data } 或 null
   */
  const findClosestKlineByTime = useCallback((klineData, targetTime) => {
    if (!klineData || klineData.length === 0) return null;

    let left = 0;
    let right = klineData.length - 1;
    let closestIndex = 0;
    let minDiff = Math.abs(klineData[0].time - targetTime);

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const diff = Math.abs(klineData[mid].time - targetTime);

      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = mid;
      }

      if (klineData[mid].time === targetTime) {
        return { index: mid, data: klineData[mid] };
      } else if (klineData[mid].time < targetTime) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    return { index: closestIndex, data: klineData[closestIndex] };
  }, []);

  /**
   * 创建十字线同步处理函数
   *
   * @param {Array} targetCharts - 目标图表数组
   * @returns {Function} 十字线移动事件处理函数
   */
  const syncCrosshair = useCallback(
    (targetCharts) => {
      return (param) => {
        if (!param.time) {
          // 清除所有目标图表的十字线
          targetCharts.forEach(({ chart }) => {
            if (chart.current) {
              chart.current.clearCrosshairPosition();
            }
          });
          return;
        }

        const sourceTime = param.time;

        // 同步到每个目标图表
        targetCharts.forEach(({ chart, series, data }) => {
          if (!chart.current || !series.current?.candlestick || !data.current) {
            return;
          }

          // 查找最接近的K线
          const result = findClosestKlineByTime(data.current, sourceTime);

          if (result && result.data) {
            // 设置十字线位置
            chart.current.setCrosshairPosition(
              result.data.close,
              result.data.time,
              series.current.candlestick
            );
          }
        });
      };
    },
    [findClosestKlineByTime]
  );

  /**
   * 创建可见范围同步处理函数
   *
   * @param {Object} sourceChart - 源图表引用
   * @param {Array} targetCharts - 目标图表数组
   * @returns {Function} 时间轴缩放事件处理函数
   */
  const syncVisibleRange = useCallback(
    (sourceChart, targetCharts) => {
      return () => {
        if (!sourceChart.current) return;

        const sourceTimeRange = sourceChart.current
          .timeScale()
          .getVisibleRange();
        if (!sourceTimeRange) return;

        targetCharts.forEach(({ chart, data }) => {
          if (!chart.current || !data.current || data.current.length === 0) {
            return;
          }

          // 找到目标图表中对应的时间范围
          const startResult = findClosestKlineByTime(
            data.current,
            sourceTimeRange.from
          );
          const endResult = findClosestKlineByTime(
            data.current,
            sourceTimeRange.to
          );

          if (startResult && endResult) {
            // 设置逻辑范围
            chart.current.timeScale().setVisibleLogicalRange({
              from: startResult.index,
              to: endResult.index,
            });
          }
        });
      };
    },
    [findClosestKlineByTime]
  );

  useEffect(() => {
    const chartIds = Array.from(chartRefs.current.keys());

    if (chartIds.length < 2) return;

    const charts = chartIds.map(id => ({
      id,
      chart: { current: chartRefs.current.get(id) },
      series: { current: seriesRefs.current.get(id) },
      data: { current: dataRefs.current.get(id) }
    })).filter(c => c.chart.current && c.series.current && c.data.current);

    if (charts.length < 2) return;

    const subscriptions = [];

    charts.forEach((source) => {
      const targets = charts.filter((c) => c.id !== source.id);

      const crosshairHandler = syncCrosshair(targets);
      source.chart.current.subscribeCrosshairMove(crosshairHandler);
      subscriptions.push({
        chart: source.chart.current,
        handler: crosshairHandler,
        type: "crosshair",
      });

      const rangeHandler = syncVisibleRange(source.chart, targets);
      source.chart.current
        .timeScale()
        .subscribeVisibleLogicalRangeChange(rangeHandler);
      subscriptions.push({
        timeScale: source.chart.current.timeScale(),
        handler: rangeHandler,
        type: "range",
      });
    });

    return () => {
      subscriptions.forEach(({ chart, timeScale, handler, type }) => {
        if (type === "crosshair" && chart) {
          chart.unsubscribeCrosshairMove(handler);
        } else if (type === "range" && timeScale) {
          timeScale.unsubscribeVisibleLogicalRangeChange(handler);
        }
      });
    };
  }, [chartsData, syncCrosshair, syncVisibleRange]);

  return { findClosestKlineByTime };
};
