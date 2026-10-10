// Management-area icons: the NextAdmin kit's icon set (@tailgrids/icons) exposed
// under the names the screens already use, so call sites only change their import.
// Header/sidebar also retain SVG icons supplied by the NextAdmin reference.
import type { ComponentType, SVGProps } from 'react'
import { CreditCardIcon, GearIcon, LetterIcon, LogoutIcon, MenuIcon, MoonIcon, SearchIcon, SunIcon } from './layout/header-icons'
import {
  AltArrowDownIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  CalendarIcon,
  CloseIcon,
  HomeIcon,
  MenuDotsIcon,
  PlusIcon,
  UserGroupIcon,
  UserIcon,
} from './layout/sidebar-icons'
import {
  AltArrowLeftIcon,
  AltArrowRightIcon,
  ArrowRightUpIcon,
  EyeIcon,
  FilterIcon,
  TrashBinIcon,
} from './layout/next-icons'

export type IconProps = SVGProps<SVGSVGElement> & { size?: number }
export type LucideIcon = ComponentType<IconProps>

export {
  ErrorCircle as AlertCircle,
  InfoTriangle as AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CertificateBadge1 as Award,
  XmarkCircle as Ban,
  Bell1 as Bell,
  OpenBook as BookOpen,
  Book4 as BookOpenCheck,
  CalendarTime as CalendarClock,
  Check,
  CheckCircle1 as CheckCircle2,
  Dollar as CircleDollarSign,
  CheckCircle1 as ClipboardCheck,
  FileTextMultiple as ClipboardList,
  ClockThree as Clock3,
  Copy1 as Copy,
  FileText as FileCheck2,
  FileText as FilePlus2,
  FileText,
  InfoCircle as Info,
  Bank1 as Landmark,
  Layers2 as Layers3,
  Reload as LoaderCircle,
  Locked3 as LockKeyhole,
  MapMarker5 as MapPin,
  Link1AngularRight as ExternalLink,
  MenuFriesLeft1 as List,
  Envelope1 as MailQuestion,
  Pencil1 as Pencil,
  Phone,
  Play as PlayCircle,
  Play,
  Reload as RefreshCw,
  ArrowBothDirectionHorizontal2 as Repeat2,
  Send1 as Send,
  Phone as Smartphone,
  UserCircle1 as UserCheck,
  UserPencil as UserCog,
  Wallet2 as Wallet,
  WaveformLines as Activity,
  CheckCircle1 as BadgeCheck,
  BarChart2 as BarChart3,
  BotUser1 as Bot,
  Brain1 as Brain,
  Camera1 as Camera,
  ErrorCircle as CircleAlert,
  ClockThree as Clock,
  ExpandArrow6 as Expand,
  EyeDisabled as EyeOff,
  FileText as FileQuestion,
  Fire as Flame,
  Atom as FlaskConical,
  Hat1 as GraduationCap,
  QuestionMarkCircle as HelpCircle,
  Globe2 as Languages,
  Layers2 as Layers,
  TrendUp2 as LineChart,
  DoubleCheckMark as ListChecks,
  MenuFriesLeft1 as ListTree,
  Reload as Loader2,
  Locked3 as Lock,
  ExpandSquare4 as Maximize2,
  PenToSquare as NotebookPen,
  BoxArchive1 as PackageOpen,
  SearchPlus as PackageSearch,
  Megaphone1 as Radio,
  Reload as RotateCcw,
  Row as Rows3,
  BagShopping2 as ShoppingBag,
  Cart2 as ShoppingCart,
  Sparkle as Sparkles,
  StarIcon as Star,
  Target3 as Target,
  TrendUp2 as TrendingUp,
  Crown1 as Trophy,
  Volume1 as Volume2,
  Video,
  XmarkCircle as XCircle,
} from '@tailgrids/icons'

// Specialized student/public glyphs absent from the installed NextAdmin set.
// Management screens do not use these fallbacks.
export {
  Calculator,
  Circle,
  CircleDot,
  GripVertical,
  KeyRound,
  Pause,
  QrCode,
  Save,
  ShieldAlert,
  TrendingDown,
  UserPlus,
  UserRoundMinus,
} from 'lucide-react'

// The NextAdmin demo's own SVGs for the glyphs it draws itself (header, sidebar,
// tables). Fixed 20px/16px artwork, so size is applied through style.
function Sized({ icon: Icon, size, style, ...props }: IconProps & { icon: ComponentType<SVGProps<SVGSVGElement>> }) {
  return <Icon {...props} style={size ? { ...style, width: size, height: size } : style} />
}

export const Search = (props: IconProps) => <Sized icon={SearchIcon} {...props} />
export const SearchX = (props: IconProps) => <Sized icon={SearchIcon} {...props} />
export const Settings = (props: IconProps) => <Sized icon={GearIcon} {...props} />
export const Mail = (props: IconProps) => <Sized icon={LetterIcon} {...props} />
export const CreditCard = (props: IconProps) => <Sized icon={CreditCardIcon} {...props} />
export const LogOut = (props: IconProps) => <Sized icon={LogoutIcon} {...props} />
export const Sun = (props: IconProps) => <Sized icon={SunIcon} {...props} />
export const Moon = (props: IconProps) => <Sized icon={MoonIcon} {...props} />
export const Menu = (props: IconProps) => <Sized icon={MenuIcon} {...props} />
export const Home = (props: IconProps) => <Sized icon={HomeIcon} {...props} />
export const LayoutDashboard = (props: IconProps) => <Sized icon={HomeIcon} {...props} />
export const Calendar = (props: IconProps) => <Sized icon={CalendarIcon} {...props} />
export const CalendarDays = (props: IconProps) => <Sized icon={CalendarIcon} {...props} />
export const CalendarPlus = (props: IconProps) => <Sized icon={CalendarIcon} {...props} />
export const User = (props: IconProps) => <Sized icon={UserIcon} {...props} />
export const UserRound = (props: IconProps) => <Sized icon={UserIcon} {...props} />
export const Users = (props: IconProps) => <Sized icon={UserGroupIcon} {...props} />
export const ChevronDown = (props: IconProps) => <Sized icon={AltArrowDownIcon} {...props} />
export const ChevronLeft = (props: IconProps) => <Sized icon={AltArrowLeftIcon} {...props} />
export const ChevronRight = (props: IconProps) => <Sized icon={AltArrowRightIcon} {...props} />
export const MoreHorizontal = (props: IconProps) => <Sized icon={MenuDotsIcon} {...props} />
export const ArrowUp = (props: IconProps) => <Sized icon={ArrowUpIcon} {...props} />
export const ArrowDown = (props: IconProps) => <Sized icon={ArrowDownIcon} {...props} />
export const ArrowUpRight = (props: IconProps) => <Sized icon={ArrowRightUpIcon} {...props} />
export const Plus = (props: IconProps) => <Sized icon={PlusIcon} {...props} />
export const Filter = (props: IconProps) => <Sized icon={FilterIcon} {...props} />
export const Eye = (props: IconProps) => <Sized icon={EyeIcon} {...props} />
export const Trash2 = (props: IconProps) => <Sized icon={TrashBinIcon} {...props} />
export const X = (props: IconProps) => <Sized icon={CloseIcon} {...props} />