# 配置快照与使用边界

## 目录

```text
Claude.list                       # 原有公开规则集，保持路径不变
OpenAI.list
Twitter.list
shadowrocket/
  default.conf                    # 原始默认配置，逐字节复制
  claude-vps.conf                 # 完整定制配置，自定义路由与 Clash 脚本对齐
clash-verge/
  Merge.template.yaml             # 当前全局扩展配置，真实订阅地址已替换
  Script.js                       # 当前全局扩展脚本，逐字节复制
```

Clash 扩展和小火箭默认配置是复制时的快照，不会自动跟随本机活动配置变化；小火箭定制配置在此维护。本目录现为两份小火箭配置的维护位置，原 `D:\proj\claude-env\` 下副本已删除。本次没有修改活动配置、重启客户端或推送 GitHub。

## Shadowrocket

- `default.conf` 是原件快照，不要用定制内容覆盖。
- `claude-vps.conf` 是完整配置，不是模块；节点需要另外导入。导入后检查 `Claude-VPS` 组，并手动选择 VPS 节点；该组默认 REJECT。
- 两份配置不含节点密码或订阅凭据。发布后可用完整配置的 Raw URL 导入。
- 手机测试只确认模块 `[Rule]` 生效；模块中的 `[Proxy Group]` 未实现预期的默认 REJECT 行为，曾显示机场节点。因此本目录不提供声称已通过验证的模块版本。
- 手机新建的测试模块不在本机源码中，本次未复制。`default.conf` 保持原样，`claude-vps.conf` 仅对齐自定义路由和 VPS 节点名筛选，没有改为模块方案。

## Clash Verge Rev

来源是当前 Clash Verge Rev 2.5.10 数据目录中的 `profiles/Merge.yaml`、`profiles/Script.js`；配置索引分别标记为全局 `merge` 和 `script`。

脚本中的 Claude 策略组名为 `✴️ Claude-VPS`，对应的 DNS 地址与名称判断保持一致。

### 敏感数据

`Merge.template.yaml` 与源配置仅有一处语义差异：`proxy-providers.ClaudeVPS.url` 已替换为 `.invalid` 示例地址。它是脱敏模板，不能不经修改直接用于真实订阅。

真实订阅地址只能在本机私有配置中填写，不得提交到本仓库。未复制完整运行配置、节点订阅缓存或机场配置。不要用现有完整 Merge 覆盖模板后提交。

### URL 导入边界

- 普通订阅 URL 导入与全局扩展是不同入口。2.5.10 的订阅新建表单只提供 remote/local 配置类型，不会把这两个文件自动安装为全局 merge/script。
- 发布到 GitHub 后，这两个文件可以通过 Raw URL 下载；下载并不等于安装全局扩展，也不意味着自动更新。
- 保守的安装方式：下载文件，把模板中的订阅地址只在本地补齐，再分别将内容放进“全局扩展配置”和“全局扩展脚本”编辑器。修改前备份现有全局扩展；本次没有执行安装。
- 不要将 `Merge.template.yaml` 当成机场完整订阅导入，也不要将 JavaScript URL 当成 YAML 订阅导入。
- 官方脚本环境不支持网络/文件 IO，不能靠一段全局脚本自行下载和执行远程脚本。若以后需要 URL 自动同步，需要单独设计客户端外部同步流程；本次不包含该功能。

参考：
- https://www.clashverge.dev/guide/profile.html
- https://www.clashverge.dev/guide/script.html
- https://github.com/clash-verge-rev/clash-verge-rev/blob/v2.5.10/src/components/profile/profile-viewer.tsx

## 自定义分流已对齐

以 `clash-verge/Script.js` 执行生成的规则顺序及 `Merge.template.yaml` 的规则集 URL 为准，`shadowrocket/claude-vps.conf` 的置顶规则为：

1. `niumatoken.com`、`niumacode.cc` → `🐎 牛马`。
2. Claude、OpenAI、Gemini、Google、GitHub、Cloudflare 六个远程规则集，保持相同顺序及 URL → `Claude-VPS`。
3. `gpt.com`、`apple.com` 后缀及精确域名 `ip.net.coffee` → `Claude-VPS`；不再将 `ip.net.coffee` 直连。

VPS 节点筛选也接受 Clash 脚本支持的可选 `🇺🇸 ` 名称前缀；小火箭仍默认 REJECT，需手动选节点。其后保留原版默认规则，不迁移机场专属组或兜底配置。

对齐范围是自定义分流规则，不是完整客户端行为：Clash 脚本还生成分域名 DNS 策略，小火箭仍保留原始 system DNS 设置。未声称 DNS、远程规则下载和实际出口已通过手机验收。

## 本次验证

- `default.conf` 原始基线保持不变，`Script.js` 与复制时的活动源文件逐字节一致。
- `Merge.template.yaml` 可解析为 YAML；与源文件结构比较，只有上述订阅 URL 发生变化。
- 四份配置副本不包含源订阅 URL 或该订阅主机名。
- 用 Node 执行脚本的内存样例，检查 ClaudeVPS provider 绑定、REJECT 成员、Claude/OpenAI 路由、DNS 策略和原有兜底规则保留。
- 执行 Clash `main()` 并将规则集名映射为 Merge 中的 URL，确认小火箭前 11 条自定义规则与执行结果逐条、按顺序一致；后续全部原版规则及其余基线节保持不变。
- 检查 `ip.net.coffee`、Apple、gpt 和牛马域名的规则优先级，以及带/不带美国旗帜的 VPS 节点名筛选、机场名称排除。
- 未在 Clash Verge 的脚本引擎重新运行或应用配置；Node 冒烟不等于客户端端到端验收。未验证远程 URL，因为尚未发布。
