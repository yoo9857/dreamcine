import { readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export interface ObservabilityContractResult {
  readonly ok: boolean
  readonly problems: readonly string[]
}

export async function checkObservabilityContract(
  root = process.cwd(),
): Promise<ObservabilityContractResult> {
  const monitoring = resolve(root, 'infra', 'monitoring')
  const alerts = await readFile(resolve(monitoring, 'alerts.yml'), 'utf8')
  const alertBlocks = alerts.split(/\n\s*- alert: /u).slice(1)
  const problems: string[] = []
  if (alertBlocks.length === 0) problems.push('알럿 규칙이 없습니다')
  for (const block of alertBlocks) {
    const name = block.split('\n')[0]?.trim() ?? 'unknown'
    if (!block.includes(' runbook:'))
      problems.push(`${name}: runbook 주석이 없습니다`)
    if (!/severity: (warning|critical)/u.test(block))
      problems.push(`${name}: 유효한 severity가 없습니다`)
  }

  const dashboardDirectory = resolve(monitoring, 'dashboards')
  const dashboardFiles = (await readdir(dashboardDirectory)).filter((file) =>
    file.endsWith('.json'),
  )
  if (dashboardFiles.length !== 3)
    problems.push(
      `Grafana 대시보드는 정확히 3개여야 합니다: ${String(dashboardFiles.length)}`,
    )
  for (const file of dashboardFiles) {
    const dashboard = JSON.parse(
      await readFile(resolve(dashboardDirectory, file), 'utf8'),
    ) as unknown
    if (!isDashboard(dashboard))
      problems.push(`${file}: 제목·uid·패널이 필요합니다`)
  }

  const prometheus = await readFile(
    resolve(monitoring, 'prometheus.yml'),
    'utf8',
  )
  for (const target of [
    'web:3000',
    'worker:9100',
    'node-exporter:9100',
    'postgres-exporter:9187',
    'redis-exporter:9121',
  ]) {
    if (!prometheus.includes(target))
      problems.push(`Prometheus scrape 대상 누락: ${target}`)
  }
  for (const alert of [
    'ReadinessFailureCritical',
    'TranscodeSuccessRateCritical',
    'DbConnectionsCritical',
    'RedisMemoryCritical',
    'BackupStaleCritical',
  ]) {
    if (!alerts.includes(`alert: ${alert}`))
      problems.push(`필수 NFR 알럿 누락: ${alert}`)
  }

  const gateWorkflow = await readFile(
    resolve(root, '.github', 'workflows', 'gate.yml'),
    'utf8',
  )
  if (
    !gateWorkflow.includes('--entrypoint promtool') ||
    !gateWorkflow.includes('check rules /etc/aidream/alerts.yml')
  ) {
    problems.push(
      'CI가 Prometheus 이미지에서 promtool 엔트리포인트를 실행하지 않습니다',
    )
  }
  return { ok: problems.length === 0, problems }
}

function isDashboard(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as {
    title?: unknown
    uid?: unknown
    panels?: unknown
  }
  return (
    typeof candidate.title === 'string' &&
    typeof candidate.uid === 'string' &&
    Array.isArray(candidate.panels) &&
    candidate.panels.length > 0
  )
}

async function main(): Promise<void> {
  const result = await checkObservabilityContract()
  if (!result.ok) {
    process.stderr.write(`${result.problems.join('\n')}\n`)
    process.exitCode = 1
    return
  }
  process.stdout.write('observability contract: OK\n')
}

const entryPath = process.argv[1]
if (
  entryPath !== undefined &&
  import.meta.url === pathToFileURL(entryPath).href
) {
  void main().catch((error: unknown) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    )
    process.exitCode = 1
  })
}
