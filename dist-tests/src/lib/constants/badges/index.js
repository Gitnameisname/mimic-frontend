"use strict";
/**
 * `@/lib/constants/badges` — 도메인별 배지 className 재노출.
 *
 * 사용 예:
 *   import {
 *     EXTRACTION_STATUS_BADGE_CLASSES,
 *     GOLDEN_SET_STATUS_BADGE_CLASSES,
 *   } from "@/lib/constants/badges";
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVALUATION_RUN_STATUS_BADGE_CLASSES = exports.GOLDEN_SET_STATUS_BADGE_CLASSES = exports.EXTRACTION_STATUS_BADGE_CLASSES = void 0;
var extraction_1 = require("./extraction");
Object.defineProperty(exports, "EXTRACTION_STATUS_BADGE_CLASSES", { enumerable: true, get: function () { return extraction_1.EXTRACTION_STATUS_BADGE_CLASSES; } });
var goldenSet_1 = require("./goldenSet");
Object.defineProperty(exports, "GOLDEN_SET_STATUS_BADGE_CLASSES", { enumerable: true, get: function () { return goldenSet_1.GOLDEN_SET_STATUS_BADGE_CLASSES; } });
var evaluation_1 = require("./evaluation");
Object.defineProperty(exports, "EVALUATION_RUN_STATUS_BADGE_CLASSES", { enumerable: true, get: function () { return evaluation_1.EVALUATION_RUN_STATUS_BADGE_CLASSES; } });
