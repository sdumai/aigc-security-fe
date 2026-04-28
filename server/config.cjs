require("dotenv").config({ path: ".env.local" });

const DEFAULTS = {
  PORT: 3001,
  JSON_LIMIT: "30mb",
  VOLC_ARK_BASE: "https://ark.cn-beijing.volces.com/api/v3",
  VOLC_ARK_I2V_MODEL: "doubao-seedance-1-0-lite-i2v-250428",
  VOLC_ARK_IMAGE_MODEL: "doubao-seedream-5-0-260128",
  VOLC_ARK_IMAGE_MODEL_4_5: "doubao-seedream-4-5-251128",
  VOLC_ARK_T2V_MODEL: "doubao-seedance-1-0-lite-t2v-250428",
  UNIVERSAL_FAKE_DETECT_URL: "http://127.0.0.1:8008",
  STABLE_DIFFUSION_SERVICE_URL: "http://127.0.0.1:8009",
  MODELSCOPE_T2V_URL: "http://127.0.0.1:8011",
  VOLC_CV_HOST: "open.volcengineapi.com",
  VOLC_VISUAL_HOST: "visual.volcengineapi.com",
  VOLC_SERVICE: "cv",
  VOLC_REGION: "cn-north-1",
};

function trimEnv(...names) {
  for (const name of names) {
    const value = process.env[name];
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }
  return "";
}

function envOrDefault(defaultValue, ...names) {
  return trimEnv(...names) || defaultValue;
}

function stripTrailingSlash(value) {
  return String(value || "").replace(/\/$/, "");
}

const config = {
  server: {
    port: envOrDefault(String(DEFAULTS.PORT), "DETECT_PROXY_PORT"),
    jsonLimit: envOrDefault(DEFAULTS.JSON_LIMIT, "EXPRESS_JSON_LIMIT"),
  },
  volc: {
    accessKey: trimEnv("VOLC_ACCESS_KEY", "VITE_VOLC_ACCESS_KEY"),
    secretKey: trimEnv("VOLC_SECRET_KEY", "VITE_VOLC_SECRET_KEY"),
    cvHost: DEFAULTS.VOLC_CV_HOST,
    visualHost: DEFAULTS.VOLC_VISUAL_HOST,
    service: DEFAULTS.VOLC_SERVICE,
    region: DEFAULTS.VOLC_REGION,
  },
  ark: {
    apiKey: trimEnv("VOLC_ARK_API_KEY", "VITE_VOLC_ARK_API_KEY"),
    visionModel: trimEnv("VOLC_ARK_VISION_MODEL", "VITE_VOLC_ARK_VISION_MODEL"),
    baseUrl: stripTrailingSlash(envOrDefault(DEFAULTS.VOLC_ARK_BASE, "VOLC_ARK_BASE")),
    i2vModel: envOrDefault(DEFAULTS.VOLC_ARK_I2V_MODEL, "VOLC_ARK_I2V_MODEL", "VITE_VOLC_ARK_I2V_MODEL"),
    imageModel: envOrDefault(DEFAULTS.VOLC_ARK_IMAGE_MODEL, "VOLC_ARK_IMAGE_MODEL", "VITE_VOLC_ARK_IMAGE_MODEL"),
    imageModels: {
      volc: envOrDefault(DEFAULTS.VOLC_ARK_IMAGE_MODEL, "VOLC_ARK_IMAGE_MODEL", "VITE_VOLC_ARK_IMAGE_MODEL"),
      "volc-seedream-4-5": envOrDefault(
        DEFAULTS.VOLC_ARK_IMAGE_MODEL_4_5,
        "VOLC_ARK_IMAGE_MODEL_4_5",
        "VITE_VOLC_ARK_IMAGE_MODEL_4_5",
      ),
    },
    t2vModel: envOrDefault(DEFAULTS.VOLC_ARK_T2V_MODEL, "VOLC_ARK_T2V_MODEL", "VITE_VOLC_ARK_T2V_MODEL"),
  },
  localServices: {
    universalFakeDetectUrl: stripTrailingSlash(
      envOrDefault(DEFAULTS.UNIVERSAL_FAKE_DETECT_URL, "UNIVERSAL_FAKE_DETECT_URL"),
    ),
    stableDiffusionUrl: stripTrailingSlash(
      envOrDefault(DEFAULTS.STABLE_DIFFUSION_SERVICE_URL, "STABLE_DIFFUSION_SERVICE_URL", "SD_SERVICE_URL"),
    ),
    modelScopeT2vUrl: stripTrailingSlash(envOrDefault(DEFAULTS.MODELSCOPE_T2V_URL, "MODELSCOPE_T2V_URL", "MS_T2V_URL")),
  },
};

function hasVolcCredentials() {
  return Boolean(config.volc.accessKey && config.volc.secretKey);
}

function hasArkApiKey() {
  return Boolean(config.ark.apiKey);
}

function hasArkVisionConfig() {
  return Boolean(config.ark.apiKey && config.ark.visionModel);
}

module.exports = {
  config,
  hasArkApiKey,
  hasArkVisionConfig,
  hasVolcCredentials,
};
