import { createBrowserRouter } from "react-router-dom";
import App from "../App";
import ChartPage from "../pages/ChartPage";
import ScanPage from "../pages/ScanPage";
import MultiLevelPage from "../pages/MultiLevelPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        index: true,
        element: <ChartPage />,
      },
      {
        path: "scan",
        element: <ScanPage />,
      },
      {
        path: "multi-level",
        element: <MultiLevelPage />,
      },
    ],
  },
]);

export default router;
