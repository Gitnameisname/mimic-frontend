"use strict";
/**
 * `@/lib/constants/labels` — 도메인별 표시 라벨 재노출.
 *
 * 사용 예:
 *   import { EXTRACTION_STATUS_LABELS, GOLDEN_SET_STATUS_LABELS } from "@/lib/constants/labels";
 *
 * i18n 도입 시 본 디렉토리만 i18n 파일로 교체 (badge className 과 분리).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVALUATION_METRIC_LABELS = exports.EVALUATION_RUN_STATUS_LABELS = exports.GOLDEN_SET_DOMAIN_LABELS = exports.GOLDEN_SET_STATUS_LABELS = exports.EXTRACTION_STATUS_LABELS = void 0;
var extraction_1 = require("./extraction");
Object.defineProperty(exports, "EXTRACTION_STATUS_LABELS", { enumerable: true, get: function () { return extraction_1.EXTRACTION_STATUS_LABELS; } });
var goldenSet_1 = require("./goldenSet");
Object.defineProperty(exports, "GOLDEN_SET_STATUS_LABELS", { enumerable: true, get: function () { return goldenSet_1.GOLDEN_SET_STATUS_LABELS; } });
Object.defineProperty(exports, "GOLDEN_SET_DOMAIN_LABELS", { enumerable: true, get: function () { return goldenSet_1.GOLDEN_SET_DOMAIN_LABELS; } });
var evaluation_1 = require("./evaluation");
Object.defineProperty(exports, "EVALUATION_RUN_STATUS_LABELS", { enumerable: true, get: function () { return evaluation_1.EVALUATION_RUN_STATUS_LABELS; } });
Object.defineProperty(exports, "EVALUATION_METRIC_LABELS", { enumerable: true, get: function () { return evaluation_1.EVALUATION_METRIC_LABELS; } });
