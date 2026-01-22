import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "antd";
import { SettingOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import ChartContainer from "../../components/ChartContainer";
import LevelSettingsModal from "../../components/LevelSettingsModal";
import {
  useMultiLevelSync,
  useStockSearch,
} from "../../components/ChartContainer/hooks";
import { chanApi } from "../../services/api";
import { useTheme } from "../../contexts/ThemeContext";
import { MULTI_LEVEL_DEFAULT_CONFIG, getDefaultIndicators } from "../../config/config";
import "./MultiLevelPage.css";

const DEFAULT_STOCK = "sh.000001";
const DEFAULT_LIMIT = 1000;

const showMessage = (messageApi, key, type, content, duration) => {
  messageApi[type]({ content, key, duration });
};

const loadConfig = () => {
  const saved = localStorage.getItem("multiLevelConfig");
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to parse config:", e);
    }
  }
  return MULTI_LEVEL_DEFAULT_CONFIG;
};

const saveConfig = (config) => {
  localStorage.setItem("multiLevelConfig", JSON.stringify(config));
};

const MultiLevelPage = () => {
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode, messageApi } = useTheme();

  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState(() => loadConfig());

  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem("favorites");
    return saved ? JSON.parse(saved) : [];
  });

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [currentStock, setCurrentStock] = useState(DEFAULT_STOCK);

  const [chartsData, setChartsData] = useState([]);

  const chartRefs = useRef(new Map());
  const seriesRefs = useRef(new Map());
  const dataRefs = useRef(new Map());

  const stockSearch = useStockSearch();

  useEffect(() => {
    localStorage.setItem("favorites", JSON.stringify(favorites));
  }, [favorites]);

  useMultiLevelSync(chartRefs, seriesRefs, dataRefs, chartsData);

  const loadAllLevels = useCallback(async () => {
    showMessage(messageApi, "query", "info", "正在查询，请稍候...", 0);
    setLoading(true);
    try {
      const promises = config.charts.map((chart) =>
        chanApi.calculateChan({
          code: currentStock,
          kline_type: chart.klineType,
          limit: DEFAULT_LIMIT,
        })
      );

      const results = await Promise.all(promises);

      const newChartsData = config.charts.map((chart, index) => ({
        id: chart.id,
        klineType: chart.klineType,
        data: results[index],
      }));

      setChartsData(newChartsData);
      showMessage(messageApi, "loadingData", "success", "数据加载成功！", 2);
    } catch (error) {
      messageApi.error("加载数据失败");
      console.error(error);
    } finally {
      messageApi.destroy("query");
      setLoading(false);
    }
  }, [currentStock, config, messageApi]);

  useEffect(() => {
    loadAllLevels();
  }, [loadAllLevels]);

  const handleStockChange = useCallback((code) => {
    setCurrentStock(code);
  }, []);

  const handleToggleFavorite = useCallback((code) => {
    setFavorites((prev) => {
      const newFavorites = prev.includes(code)
        ? prev.filter((c) => c !== code)
        : [...prev, code];
      localStorage.setItem("favorites", JSON.stringify(newFavorites));
      return newFavorites;
    });
  }, []);

  const handleSaveConfig = useCallback(
    (newConfig) => {
      // 手动resize所有图表（解决从大到小时无法正确调整高度的问题）
      chartRefs.current.forEach((ref) => {
        ref.resize(ref.chartElement().clientWidth, newConfig.chartHeight);
      });
      setConfig(newConfig);
      saveConfig(newConfig);
      loadAllLevels();
    },
    [loadAllLevels]
  );

  return (
    <>
      <div className="multi-level-page">
        <div className="multi-level-header">
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate("/")}
          >
            返回主页
          </Button>
          <span className="page-title">多级别联立</span>
          <Button
            type="primary"
            icon={<SettingOutlined />}
            onClick={() => setSettingsOpen(true)}
          >
            级别设置
          </Button>
        </div>

        <div className="multi-level-content">
          {config.charts
            .sort((a, b) => a.order - b.order)
            .map((chart, index) => {
              const chartData = chartsData.find((d) => d.id === chart.id);

              return (
                <div
                  key={chart.id}
                  className="chart-section"
                  style={{ height: `${config.chartHeight}px` }}
                >
                  <ChartContainer
                    data={chartData?.data}
                    darkMode={darkMode}
                    indicators={getDefaultIndicators()}
                    favorites={favorites}
                    showVolume={false}
                    showSubChart={false}
                    showTitle={index === 0}
                    showControl={true}
                    canEditLevel={false}
                    canEditLength={false}
                    showKlineInfo={false}
                    isAutoSize={false}
                    stockSearch={stockSearch}
                    chartRefOut={(ref) => {
                      if (ref) chartRefs.current.set(chart.id, ref);
                      else chartRefs.current.delete(chart.id);
                    }}
                    seriesRefOut={(ref) => {
                      if (ref) seriesRefs.current.set(chart.id, ref);
                      else seriesRefs.current.delete(chart.id);
                    }}
                    dataRefOut={(ref) => {
                      if (ref) dataRefs.current.set(chart.id, ref);
                      else dataRefs.current.delete(chart.id);
                    }}
                    currentStock={{
                      code: currentStock,
                      klineType: chart.klineType,
                      limit: DEFAULT_LIMIT,
                    }}
                    onToggleFavorite={handleToggleFavorite}
                    onStockChange={index === 0 ? handleStockChange : undefined}
                  />
                </div>
              );
            })}
        </div>

        <LevelSettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          config={config}
          onSave={handleSaveConfig}
        />
      </div>
    </>
  );
};

export default MultiLevelPage;
