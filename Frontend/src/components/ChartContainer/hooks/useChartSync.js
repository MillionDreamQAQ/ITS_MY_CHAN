import { useCallback, useEffect } from "react";

export const useChartSync = (mainChartRef, subChartRef, seriesRef) => {
  // 主图十字线移动时同步 MACD 图
  const handleMainCrosshairMove = useCallback(
    (param) => {
      if (param.time && seriesRef.current?.histogram && subChartRef.current) {
        const subHistogramData = seriesRef.current.histogram.dataByIndex(
          param.logical
        );

        if (subHistogramData) {
          subChartRef.current.setCrosshairPosition(
            subHistogramData.value,
            param.time,
            seriesRef.current.histogram
          );
        }
      } else if (subChartRef.current) {
        subChartRef.current.clearCrosshairPosition();
      }
    },
    [subChartRef, seriesRef]
  );

  // MACD 图十字线移动时同步主图
  const handleSubCrosshairMove = useCallback(
    (param) => {
      if (
        param.time &&
        seriesRef.current?.candlestick &&
        mainChartRef.current
      ) {
        const klineData = seriesRef.current.candlestick.dataByIndex(
          param.logical
        );

        if (klineData) {
          mainChartRef.current.setCrosshairPosition(
            klineData.close,
            param.time,
            seriesRef.current.candlestick
          );
        }
      } else if (mainChartRef.current) {
        mainChartRef.current.clearCrosshairPosition();
      }
    },
    [mainChartRef, seriesRef]
  );

  // 从主图同步时间轴到 MACD 图
  const syncTimeFromMain = useCallback(() => {
    if (mainChartRef.current && subChartRef.current) {
      const mainRange = mainChartRef.current
        .timeScale()
        .getVisibleLogicalRange();
      if (mainRange) {
        subChartRef.current.timeScale().setVisibleLogicalRange(mainRange);
      }
    }
  }, [mainChartRef, subChartRef]);

  // 从 MACD 图同步时间轴到主图
  const syncTimeFromSub = useCallback(() => {
    if (subChartRef.current && mainChartRef.current) {
      const subRange = subChartRef.current
        .timeScale()
        .getVisibleLogicalRange();
      if (subRange) {
        mainChartRef.current.timeScale().setVisibleLogicalRange(subRange);
      }
    }
  }, [mainChartRef, subChartRef]);

  // 订阅图表同步事件
  useEffect(() => {
    if (!mainChartRef.current || !subChartRef.current) return;

    mainChartRef.current.subscribeCrosshairMove(handleMainCrosshairMove);
    subChartRef.current.subscribeCrosshairMove(handleSubCrosshairMove);

    mainChartRef.current
      .timeScale()
      .subscribeVisibleLogicalRangeChange(syncTimeFromMain);
    subChartRef.current
      .timeScale()
      .subscribeVisibleLogicalRangeChange(syncTimeFromSub);

    return () => {
      if (mainChartRef.current) {
        mainChartRef.current.unsubscribeCrosshairMove(handleMainCrosshairMove);
        mainChartRef.current
          .timeScale()
          .unsubscribeVisibleLogicalRangeChange(syncTimeFromMain);
      }

      if (subChartRef.current) {
        subChartRef.current.unsubscribeCrosshairMove(handleSubCrosshairMove);
        subChartRef.current
          .timeScale()
          .unsubscribeVisibleLogicalRangeChange(syncTimeFromSub);
      }
    };
  }, [
    mainChartRef,
    subChartRef,
    handleMainCrosshairMove,
    handleSubCrosshairMove,
    syncTimeFromMain,
    syncTimeFromSub,
  ]);
};
