/**
 * 公共类型定义
 */

/** 头名统一小写、值为字符串的请求/响应头映射 */
export type HeaderMap = Record<string, string>;

export interface CacheControlDirectives {
  raw?: string;
  // —— 响应侧 ——
  'no-store'?: boolean;
  'no-cache'?: boolean | string[];
  'must-revalidate'?: boolean;
  'proxy-revalidate'?: boolean;
  public?: boolean;
  private?: boolean | string[];
  immutable?: boolean;
  'no-transform'?: boolean;
  'max-age'?: number;
  's-maxage'?: number;
  'stale-while-revalidate'?: number;
  'stale-if-error'?: number;
  // —— 请求侧 ——
  'max-stale'?: number | true;
  'min-fresh'?: number;
  'only-if-cached'?: boolean;
  /** 未识别的扩展指令名，仅用于解释轨迹 */
  extensions?: string[];
}

export interface ParseCacheControlResult {
  directives: CacheControlDirectives;
  warnings: string[];
}

/** 单步判定轨迹，可被客户端逐步核对 */
export interface TrailStep {
  /** 阶段标识，如 normalize / key / age / freshness / serve */
  step: string;
  /** 人话解释 */
  detail: string;
  /** 该步骤涉及的结构化数据 */
  data?: unknown;
}

/** 规范化 URL 的产物 */
export interface NormalizedUrl {
  normalized: string;
  scheme: string;
  host: string;
  port: string;
  pathname: string;
  search: string;
  query: Array<{ name: string; value: string }>;
}

export interface CacheKeyDetails {
  method: string;
  normalizedUrl: string;
  varyNames: string[];
  varySelectors: Array<{ name: string; value: string | null }>;
  /** 参与哈希的原始字符串，便于核对 */
  keyMaterial: string;
  cacheKey: string;
}

/** tokens 表行 */
export interface TokenRow {
  token: string;
  cache_key: string;
  reason: string;
  issued_at: number;
  request_id: string;
  status: 'pending' | 'consumed' | 'released';
  etag: string | null;
  payload_hash: string | null;
  consumed_at: number | null;
  result_summary: string | null;
  method: string | null;
  normalized_url: string | null;
  vary_names: string | null;
  /** 提交的回源状态码（实际提交值，含 304/5xx；未结束为 null） */
  origin_status: number | null;
  /** stale-if-error 回退记录（JSON 字符串）；无回退判定为 null */
  fallback_json: string | null;
}

/** entries 表行 */
export interface EntryRow {
  cache_key: string;
  method: string;
  normalized_url: string;
  vary_names: string; // JSON string[]
  vary_selectors_json: string; // JSON [{name,value}]
  request_headers: string; // JSON HeaderMap（回源请求快照）
  status: number;
  response_headers: string; // JSON HeaderMap
  body: string | null;
  stored_at: number;
  created_at: number;
  updated_at: number;
}

/** stale-if-error 回退判定结论 */
export type StaleIfErrorReason =
  | 'served-stale-if-error'
  | 'stale-if-error-window-exceeded'
  | 'stale-if-error-entry-missing'
  | 'stale-if-error-not-declared';

/**
 * 回源得到 5xx 时对 stale-if-error 的判定记录。
 * 挂在已结束令牌上（tokens.fallback_json），供后续请求/等待者观察同一次结论。
 */
export interface StaleFallbackRecord {
  /** 是否保留并继续服务旧副本 */
  servedStale: boolean;
  /** 回退结论代码 */
  reason: StaleIfErrorReason;
  /** 人话说明 */
  detail: string;
  /** 源站返回的状态码（500/502/503/504） */
  originStatus: number;
  /** 判定时刻（取回源 originTime）旧副本的年龄（毫秒，负数钳 0） */
  ageMs: number;
  ageSeconds: number;
  /** 旧副本新鲜寿命（毫秒） */
  lifetimeMs: number;
  /** stale-if-error 窗口（毫秒；未声明为 0） */
  staleIfErrorMs: number;
  staleIfErrorSeconds: number;
  /** 可服务窗口上界 lifetime+SIE（毫秒）；无旧条目为 null */
  windowEndMs: number | null;
  /** 旧副本的 storedAt；无旧条目为 null */
  staleStoredAt: number | null;
  /** 逐步解释轨迹 */
  trail: TrailStep[];
}

/** 回源令牌签发结果 */
export interface IssueTokenResult {
  row: TokenRow;
  /** true=本次请求是并发组里的领队（拿到令牌并负责提交回源结果） */
  leader: boolean;
}
