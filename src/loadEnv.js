/**
 * 저장소 루트 `.env` 를 로드합니다.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(REPO_ROOT, '.env') });
