/**
 * 腾讯云图片内容安全（IMS）前端调用
 * 通过本地代理 server/index.cjs 请求，避免浏览器 CORS，密钥仅存服务端
 * @see https://cloud.tencent.cn/document/product/1125/116997
 */

/** 腾讯云 ImageModeration 请求参数 */
export interface ImageModerationParams {
  FileContent?: string;
  FileUrl?: string;
  BizType?: string;
  DataId?: string;
}

/** 腾讯云 ImageModeration 响应（仅保留本页用到的字段） */
export interface ImageModerationResponse {
  Response?: {
    RequestId?: string;
    HitFlag?: number;
    Suggestion?: string;
    Label?: string;
    SubLabel?: string;
    Score?: number;
    LabelResults?: Array<{
      Scene?: string;
      Label?: string;
      SubLabel?: string;
      Score?: number;
      Suggestion?: string;
    }>;
    Error?: {
      Code?: string;
      Message?: string;
    };
  };
}

/**
 * 通过本地代理调用腾讯云图片同步检测（推荐，避免浏览器 CORS，密钥存服务端）
 * 需先启动代理：node server/index.cjs
 */
export async function imageModerationViaProxy(params: ImageModerationParams): Promise<ImageModerationResponse> {
  const body = {
    fileContent: params.FileContent,
    fileUrl: params.FileUrl,
    bizType: params.BizType,
  };
  const res = await fetch("/api/detect/tencent-ims", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: ImageModerationResponse;
  try {
    json = (text ? JSON.parse(text) : {}) as ImageModerationResponse;
  } catch {
    if (!res.ok) {
      throw new Error(
        res.status === 500 && !text
          ? "代理返回错误：请确认已启动 node server/index.cjs 且 .env.local 已配置腾讯云密钥"
          : text || `请求失败 ${res.status}`,
      );
    }
    throw new Error("代理返回内容格式错误");
  }
  if (json.Response?.Error) {
    const err = json.Response.Error;
    throw new Error(err.Message || err.Code || "腾讯云接口错误");
  }
  // 腾讯云 Node SDK 可能直接返回 Response 内层（无 Response 包装），统一为 { Response }
  const hasResponse = json.Response != null && typeof json.Response === "object";
  const hasTopLevel = "RequestId" in json || "HitFlag" in json || "Suggestion" in json;
  if (!hasResponse && hasTopLevel) {
    json = { Response: json as ImageModerationResponse["Response"] };
  }
  return json;
}
