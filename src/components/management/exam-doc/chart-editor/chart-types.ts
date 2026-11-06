import type { ComponentType } from 'react'
import {
  ChartArea,
  ChartBar,
  ChartBarStacked,
  ChartColumn,
  ChartColumnStacked,
  ChartLine,
  ChartNoAxesCombined,
  ChartPie,
  ChartScatter,
  ChartSpline,
  Donut,
  Table,
} from 'lucide-react'
import type { IconProps } from '../../../console/icons'
import type { ChartType, DataChartType } from '../chart-data'

/** A kind of chart as the menu and the chart editor offer it: its short name and its icon. */
export interface ChartTypeOption<T extends ChartType = ChartType> {
  id: T
  label: string
  icon: ComponentType<IconProps>
}

/** The data charts of the chart editor's "Loại biểu đồ", in the order a docs app lists them. */
export const DATA_CHART_OPTIONS: ChartTypeOption<DataChartType>[] = [
  { id: 'bar', label: 'Cột', icon: ChartColumn },
  { id: 'horizontalBar', label: 'Thanh', icon: ChartBar },
  { id: 'stackedBar', label: 'Cột chồng', icon: ChartColumnStacked },
  { id: 'stackedHorizontalBar', label: 'Thanh chồng', icon: ChartBarStacked },
  { id: 'line', label: 'Đường', icon: ChartLine },
  { id: 'area', label: 'Vùng', icon: ChartArea },
  { id: 'scatter', label: 'Phân tán', icon: ChartScatter },
  { id: 'pie', label: 'Tròn', icon: ChartPie },
  { id: 'donut', label: 'Vành khuyên', icon: Donut },
  { id: 'combo', label: 'Kết hợp', icon: ChartNoAxesCombined },
]

/** Chèn ▸ Biểu đồ: the common data charts, then a function's graph and a variation table. */
export const INSERT_DATA_CHARTS = DATA_CHART_OPTIONS.filter((option) => ['bar', 'horizontalBar', 'line', 'pie'].includes(option.id))

export const INSERT_FIGURES: ChartTypeOption<'function' | 'variation'>[] = [
  { id: 'function', label: 'Đồ thị hàm số', icon: ChartSpline },
  { id: 'variation', label: 'Bảng biến thiên', icon: Table },
]
