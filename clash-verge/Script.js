// 固定规则：直接写完整的目标策略
// 优先于下面各组的规则
const CUSTOM_RULES = [
  //"DOMAIN,ip.net.coffee,DIRECT"
];

// 分组规则：脚本自动补上 targetGroupName
const ROUTING_GROUPS = [
  {
    targetGroupName: "🐎 牛马",
    include: [],
    exclude: [".*"],
    rules: [
      "DOMAIN-SUFFIX,niumatoken.com",
      "DOMAIN-SUFFIX,niumacode.cc"
    ]
  },
  {
    targetGroupName: "🌐 外网影音",
    include: [],
    exclude: [],
    fixedMembers: ["☀️ Claude-VPS"],
    includeAllProviders: true,
    rules: [
      "RULE-SET,Twitter",
      "RULE-SET,YouTube",
      "RULE-SET,Twitch"
    ]
  },
  {
    targetGroupName: "☀️ Claude-VPS",
    provider: "ClaudeVPS",
    include: ["^(🇺🇸 )?VPS-Claude-(WG|Trojan)$"],
    exclude: [],
    fixedMembers: ["REJECT"],
    // 此组域名查询经同一策略组连接 Cloudflare DoH。
    dnsServer: "https://1.1.1.1/dns-query#☀️ Claude-VPS",
    rules: [
      "RULE-SET,Claude",
      "RULE-SET,OpenAI",
      "RULE-SET,Gemini",
      "RULE-SET,Google",
      "RULE-SET,GitHub"
    ]
  }
];

// 自动补上策略组名，保留末尾的规则选项
function addTarget(rule, targetGroupName) {
  const options = rule.match(/(?:,(?:no-resolve|src))+$/i);
  const base = options
    ? rule.slice(0, -options[0].length)
    : rule;

  return `${base},${targetGroupName}${options ? options[0] : ""}`;
}

function main(config) {
  const groups = Array.isArray(config["proxy-groups"])
    ? config["proxy-groups"]
    : [];

  const proxies = Array.isArray(config.proxies)
    ? config.proxies
    : [];
  const providers = config["proxy-providers"];
  const vpsProvider = providers && providers.ClaudeVPS;

  const selection = groups.find(group => group.name === "🔰 选择节点");
  if (selection && vpsProvider) {
    // Mihomo 总把 proxies 放在 use 前面；将原成员按原顺序放进内联集合，
    // 才能让 ClaudeVPS 的真实节点排在原成员前面，而非另建同名策略组。
    const originalProvider = "SelectionOriginalNodes";
    if (Array.isArray(selection.proxies) && selection.proxies.length) {
      const byName = new Map(proxies.map(proxy => [proxy.name, proxy]));
      const payload = selection.proxies.map(name => {
        if (byName.has(name)) return byName.get(name);
        if (name === "DIRECT") return {name: "DIRECT", type: "direct"};
        throw new Error(`选择节点包含非静态成员，无法保持原顺序：${name}`);
      });
      providers[originalProvider] = {type: "inline", payload};
      delete selection.proxies;
    }
    selection.use = ["ClaudeVPS", originalProvider,
      ...(selection.use || []).filter(name => name !== "ClaudeVPS" && name !== originalProvider)];
  }

  const customGroups = [];

  // 每次执行都创建新数组，避免修改外面的 CUSTOM_RULES
  const rulesToPrepend = [...new Set(CUSTOM_RULES)];

  for (const item of ROUTING_GROUPS) {
    const includePatterns = (item.include || []).map(
      pattern => new RegExp(pattern, "i")
    );

    const excludePatterns = (item.exclude || []).map(
      pattern => new RegExp(pattern, "i")
    );

    const members = item.fixedMembers
      ? [...item.fixedMembers]
      : ["DIRECT", "REJECT"];

    for (const proxy of proxies) {
      const name = proxy && proxy.name;

      if (typeof name !== "string" || !name) continue;

      const included =
        includePatterns.length === 0 ||
        includePatterns.some(pattern => pattern.test(name));

      const excluded = excludePatterns.some(
        pattern => pattern.test(name)
      );

      if (included && !excluded && !members.includes(name)) {
        members.push(name);
      }
    }

    let target = groups.find(
      group => group.name === item.targetGroupName
    );

    if (target) {
      target.type = "select";
      target.proxies = members;
    } else {
      target = {
        name: item.targetGroupName,
        type: "select",
        proxies: members
      };

      groups.push(target);
    }

    if (item.provider) {
      target.use = [item.provider];
      target.filter = item.include[0];
    }

    if (item.includeAllProviders) {
      target["include-all-providers"] = true;
    }

    if (!customGroups.includes(target)) {
      customGroups.push(target);
    }

    for (const rule of item.rules || []) {
      const fullRule = addTarget(rule, item.targetGroupName);

      if (!rulesToPrepend.includes(fullRule)) {
        rulesToPrepend.push(fullRule);
      }
    }
  }

  // 自定义组置顶，顺序与 ROUTING_GROUPS 一致
  config["proxy-groups"] = customGroups.concat(
    groups.filter(group => !customGroups.includes(group))
  );

  // 固定规则 → 分组规则 → 订阅原有规则
  const oldRules = Array.isArray(config.rules)
    ? config.rules
    : [];

  config.rules = rulesToPrepend.concat(
    oldRules.filter(rule =>
      !rulesToPrepend.includes(rule) &&
      !/^RULE-SET,Claude,/i.test(rule)
    )
  );
  // DNS 与域名路由共用 rules 名单，避免重复维护。
  const dns = config.dns || (config.dns = {});
  const policy = dns["nameserver-policy"] || (dns["nameserver-policy"] = {});
  for (const item of ROUTING_GROUPS) {
    if (!item.dnsServer) continue;
    for (const rule of item.rules || []) {
      const [type, value] = rule.split(",");
      if (type === "RULE-SET") policy[`rule-set:${value}`] = item.dnsServer;
      else if (type === "DOMAIN-SUFFIX") policy[`+.${value}`] = item.dnsServer;
      else if (type === "DOMAIN") policy[value] = item.dnsServer;
    }
    // 仅检测用；不代表所有域名的 DNS 证据。
    if (item.targetGroupName === "☀️ Claude-VPS") {
      policy["whoami.ds.akahelp.net"] = item.dnsServer;
      policy["o-o.myaddr.l.google.com"] = item.dnsServer;
    }
  }

  return config;
}