# GitHub / Gitea Workflow 开发指南（ljwx-chat）

## 1. 目标与定位

本项目采用双流水线策略：

- GitHub Workflow：保留上游发布与多架构镜像能力（`.github/workflows/docker.yml`）。
- Gitea Workflow：本地快速部署主通道（`.gitea/workflows/ci.yml`），直接对接 Harbor + `ljwx-deploy` + ArgoCD。

推荐实践：

- 白天开发联调：以 Gitea Fast Deploy 为主。
- 夜间或发布窗口：跑 GitHub 完整验证 / 发布流程。

## 2. 文件与职责

- `/.gitea/workflows/ci.yml`

- 触发：`push` 到 `main/master/develop`

- 职责：
  - 构建镜像并推送 Harbor（tag=`<short_sha>` 和 `latest`）
  - 更新 `ljwx-deploy` overlay 的 `images[].newTag`
  - 自动创建 Deploy PR（供 ArgoCD 同步）

- `/.github/workflows/docker.yml`

- 触发：`release/workflow_dispatch/pull_request_target`

- 职责：
  - 多架构镜像构建与合并 manifest
  - 上游发布链路（默认 `lobehub/lobehub`）

## 3. Gitea Fast Deploy 流程

1. 开发提交到 `main/master/develop`
2. `build-and-push`：
   - 从 Gitea 克隆代码
   - 构建 `repo/Dockerfile`
   - 推送到 `harbor.omniverseai.net/<project>/<image>:<short_sha>` 与 `latest`
3. `update-deploy`：
   - 克隆 `ljwx-deploy`
   - 更新 overlay（默认 `apps/ljwx-chat/overlays/prod/kustomization.yaml`）
   - 创建 PR（`release(ljwx-chat): <sha7>`）
4. ArgoCD 监听 `ljwx-deploy`，自动同步并 rollout

## 4. 必要 Secrets（Gitea）

必填：

- `HARBOR_USERNAME`
- `HARBOR_PASSWORD`
- `DEPLOY_REPO_TOKEN`（或 `GITEA_TOKEN`）

建议配置：

- `HARBOR_CN_HOST`（默认 `harbor.omniverseai.net`）
- `HARBOR_PROJECT`（默认 `ljwx`）
- `IMAGE_NAME`（默认 `ljwx-chat`）
- `DEPLOY_REPO`（默认 `gao/ljwx-deploy`）
- `DEPLOY_OVERLAY_FILE`（默认 `apps/ljwx-chat/overlays/prod/kustomization.yaml`）
- `GITEA_BASE_URL` / `GITEA_HOST` / `GITEA_USERNAME`
- `USE_CN_MIRROR`（默认 `true`，网络慢时建议保留）

可选（给 Python 包安装加速，用于 update-deploy 中 PyYAML）：

- `PIP_INDEX_URL`
- `PIP_EXTRA_INDEX_URL`
- `PIP_TRUSTED_HOST`

## 5. 新环境接入步骤

1. 在 Gitea 仓库配置上面的 Secrets。
2. 确认 Harbor 仓库可写：
   - `harbor.omniverseai.net/<project>/<image>`
3. 确认 `ljwx-deploy` 中存在目标 overlay，或允许 workflow 自动创建该文件路径。
4. 确认 ArgoCD Application 指向 `ljwx-deploy` 对应路径并开启自动同步。
5. 推送一次测试提交，观察：
   - 镜像是否成功 push
   - Deploy PR 是否创建
   - ArgoCD 是否自动同步

## 6. 日常开发操作

- 触发快速部署：

```bash
git add .
git commit -m "feat: ..."
git push origin main
```

- 验证顺序：

1. Gitea Actions `build-and-push` 成功
2. Harbor 有新 tag（`<sha7>`）
3. `ljwx-deploy` 出现 / 更新 PR
4. ArgoCD 状态 `Synced/Healthy`
5. `kubectl logs` 无启动异常

## 7. 常见问题与处理

- 依赖下载超时（网络抖动）

- 保持 `USE_CN_MIRROR=true`

- 优先使用 Harbor 基础镜像与国内镜像源

- Harbor 登录失败

- 检查 `HARBOR_USERNAME/HARBOR_PASSWORD`

- 临时回退账号 `admin/admin123` 仅用于本地环境，生产不建议

- Deploy PR 未创建

- 检查 `DEPLOY_REPO_TOKEN` 或 `GITEA_TOKEN`

- 检查 `DEPLOY_REPO` 是否可访问

- Overlay 更新失败

- 检查 `DEPLOY_OVERLAY_FILE` 路径

- 检查 `kustomization.yaml` 是否为合法 YAML

- ArgoCD 未自动部署

- 检查 Application 的 `repoURL/path/targetRevision`

- 检查 auto-sync 配置和集群连通性

## 8. 给新项目复用这套流程

复制 `/.gitea/workflows/ci.yml` 后只改这三项即可：

- 默认镜像名：`IMAGE_NAME` 默认值
- 默认 deploy overlay：`DEPLOY_OVERLAY_FILE` 默认值
- PR 分支和 commit 前缀中的项目名（如 `ljwx-chat`）

## 9. 变更约定

修改 workflow 时建议遵循：

- 先在测试分支验证再合入 `main`
- 每次只改一个问题域（例如仅改构建或仅改 deploy）
- 每次变更都记录一条可复现的验收结果（run 链接、镜像 tag、PR 链接）
