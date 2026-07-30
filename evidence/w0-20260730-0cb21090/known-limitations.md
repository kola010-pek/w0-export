# Known Limitations

## 1. Workspace Sync
- The workspace is in a cloud sandbox at `/workspace/projects`
- Local directory `C:\Users\luomi\Documents\金融投资智能体运营工作台` is not directly accessible
- Files must be manually synced or exported

## 2. Browser Evidence
- Browser screenshots are not included in this evidence package
- The sandbox environment does not have a graphical browser for automated screenshots
- Playwright tests were run in headless mode

## 3. Real Database
- No real database is connected
- `real_readonly` environment returns BLOCK status as expected
- `REAL_SQLITE_DB_PATH` is empty

## 4. Production Mode
- Production write/model/release are disabled by default
- `production_guarded` environment returns BLOCK status as expected

## 5. Test Coverage
- All tests pass from the current commit
- Historical tests (core.test.ts, phase2-negative-tests.ts) were re-executed
- No historical test outputs were reused
