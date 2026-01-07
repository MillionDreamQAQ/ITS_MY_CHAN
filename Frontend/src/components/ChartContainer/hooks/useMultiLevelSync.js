import { useCallback, useEffect } from "react";

/**
 * 多级别图表同步Hook
 *
 * 核心功能：处理不同周期K线的时间映射和联动
 * - 十字线同步：当一个图表的十字线移动时，其他图表的十字线也移动到对应时间
 * - 缩放同步：当一个图表缩放时，其他图表也同步缩放到对应的时间范围
 *
 * @param {Object} chartRefs - 三个图表的引用 { top, middle, bottom }
 * @param {Object} seriesRefs - 三个图表的系列引用 { top, middle, bottom }
 * @param {Object} dataRefs - 三个图表的数据引用 { top, middle, bottom }
 */
export const useMultiLevelSync = (chartRefs, seriesRefs, dataRefs) => {
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

  // 订阅所有图表的事件
  useEffect(() => {
    if (
      !chartRefs.current.top.current ||
      !chartRefs.current.middle.current ||
      !chartRefs.current.bottom.current
    ) {
      // if (!chartRefs.top || !chartRefs.middle || !chartRefs.bottom) {
      return;
    }

    const charts = [
      {
        name: "top",
        chart: chartRefs.current.top,
        series: seriesRefs.current.top,
        data: dataRefs.current.top,
      },
      {
        name: "middle",
        chart: chartRefs.current.middle,
        series: seriesRefs.current.middle,
        data: dataRefs.current.middle,
      },
      {
        name: "bottom",
        chart: chartRefs.current.bottom,
        series: seriesRefs.current.bottom,
        data: dataRefs.current.bottom,
      },
    ];

    const subscriptions = [];

    // 为每个图表订阅事件
    charts.forEach((source) => {
      const targets = charts.filter((c) => c.name !== source.name);

      // 十字线移动事件
      const crosshairHandler = syncCrosshair(targets);
      source.chart.current.subscribeCrosshairMove(crosshairHandler);
      subscriptions.push({
        chart: source.chart.current,
        handler: crosshairHandler,
        type: "crosshair",
      });

      // 时间轴缩放事件
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

    // 清理订阅
    return () => {
      subscriptions.forEach(({ chart, timeScale, handler, type }) => {
        if (type === "crosshair" && chart) {
          chart.unsubscribeCrosshairMove(handler);
        } else if (type === "range" && timeScale) {
          timeScale.unsubscribeVisibleLogicalRangeChange(handler);
        }
      });
    };
  }, [chartRefs, seriesRefs, dataRefs, syncCrosshair, syncVisibleRange]);

  return { findClosestKlineByTime };
};
