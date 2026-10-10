import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import {
  Avatar,
  Badge,
  Button,
  Card,
  Chip,
  Medallion,
  ProgressBar,
  SectionHeading,
  Stat,
  Table,
  Tabs,
} from '../components/ui'
import { demoPersona } from '../layout/demoPersona'
import { AppShell } from '../layout/AppShell'
import {
  type AppRole,
  navByRole,
  shellDemoPaths,
} from '../layout/navConfigs'

const sampleRows = [
  { id: 'E-1042', name: 'Khalid Mansour', risk: '72%' },
  { id: 'E-1088', name: 'Tariq Zaki', risk: '66%' },
  { id: 'E-1110', name: 'Huda Nasser', risk: '63%' },
]

export function DesignPreview() {
  const { t } = useTranslation()
  const [role, setRole] = useState<AppRole>('employee')
  const [tab, setTab] = useState('who')
  const config = navByRole[role]
  const activePath = shellDemoPaths[role]

  const tabLabel =
    tab === 'who'
      ? t('designPreview.tabWho')
      : tab === 'why'
        ? t('designPreview.tabWhy')
        : tab === 'strengths'
          ? t('designPreview.tabStrengths')
          : t('designPreview.tabRisks')

  return (
    <AppShell config={config} activePath={activePath} preview>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-semibold text-ink">
            {t('designPreview.title')}
          </h1>
          <p className="mt-1 text-muted">{t('designPreview.subtitle')}</p>
          <p className="mt-2 text-xs text-muted">
            <Link className="text-teal-dark underline" to="/login">
              {t('login.title')}
            </Link>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(navByRole) as AppRole[]).map((key) => (
            <Chip key={key} active={role === key} onClick={() => setRole(key)}>
              {t(`roles.${key}`)}
            </Chip>
          ))}
        </div>
      </div>

      <Card className="mb-6">
        <p className="text-muted">{t('designPreview.placeholder')}</p>
      </Card>

      <SectionHeading title={t('designPreview.componentsHeading')} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionHeading title={t('designPreview.buttons')} />
          <div className="flex flex-wrap gap-2">
            <Button variant="primary">{t('designPreview.primary')}</Button>
            <Button variant="secondary">{t('designPreview.secondary')}</Button>
            <Button variant="accent">{t('designPreview.accent')}</Button>
          </div>
        </Card>

        <Card>
          <SectionHeading title={t('designPreview.badges')} />
          <div className="flex flex-wrap gap-2">
            <Badge tone="teal">{t('designPreview.thriving')}</Badge>
            <Badge tone="coral">{t('designPreview.alert')}</Badge>
            <Badge tone="amber">{t('designPreview.atRisk')}</Badge>
            <Badge tone="violet">{t('designPreview.innovation')}</Badge>
            <Badge tone="slate">{t('designPreview.neutral')}</Badge>
          </div>
        </Card>

        <Card>
          <SectionHeading title={t('designPreview.stats')} />
          <div className="grid grid-cols-3 gap-4">
            <Stat
              label={t('designPreview.teamSize')}
              value={9}
              delta={t('designPreview.deltaUp')}
              deltaTone="up"
            />
            <Stat
              label={t('designPreview.burnoutRisk')}
              value="72%"
              delta={t('designPreview.deltaDown')}
              deltaTone="down"
            />
            <Stat
              label={t('designPreview.morale')}
              value="7.4"
              delta={t('designPreview.deltaStable')}
              deltaTone="neutral"
            />
          </div>
        </Card>

        <Card>
          <SectionHeading title={t('designPreview.medallions')} />
          <div className="flex flex-wrap items-end gap-4">
            <Medallion score={91} tier="gold" />
            <Medallion score={87} tier="silver" />
            <Medallion score={75} tier="bronze" />
            <Medallion score={62} tier="growth" size="sm" />
          </div>
        </Card>

        <Card>
          <SectionHeading title={t('designPreview.avatarChipProgress')} />
          <div className="flex flex-wrap items-center gap-3">
            <Avatar name={demoPersona.employee.name} />
            <Avatar name={demoPersona.manager.name} size="lg" />
            <Chip active>{t('designPreview.pulse')}</Chip>
            <Chip>{t('designPreview.wellbeing')}</Chip>
          </div>
          <div className="mt-4 space-y-2">
            <ProgressBar value={87} showLabel />
            <ProgressBar value={42} tone="coral" showLabel />
            <ProgressBar value={66} tone="amber" />
          </div>
        </Card>

        <Card>
          <SectionHeading title={t('designPreview.tabs')} />
          <Tabs
            items={[
              { id: 'who', label: t('designPreview.tabWho') },
              { id: 'why', label: t('designPreview.tabWhy') },
              { id: 'strengths', label: t('designPreview.tabStrengths') },
              { id: 'risks', label: t('designPreview.tabRisks') },
            ]}
            value={tab}
            onChange={setTab}
          />
          <p className="mt-3 text-muted">
            {t('designPreview.selectedTab', { tab: tabLabel })}
          </p>
        </Card>
      </div>

      <Card className="mt-6">
        <SectionHeading
          title={t('designPreview.table')}
          subtitle={t('designPreview.tableSubtitle')}
        />
        <Table
          columns={[
            {
              key: 'id',
              header: t('designPreview.colId'),
              mono: true,
              render: (r) => <span className="ltr-nums">{r.id}</span>,
            },
            { key: 'name', header: t('designPreview.colName'), render: (r) => r.name },
            {
              key: 'risk',
              header: t('designPreview.colRisk'),
              mono: true,
              render: (r) => <span className="ltr-nums">{r.risk}</span>,
            },
          ]}
          rows={sampleRows}
          rowKey={(r) => r.id}
        />
      </Card>
    </AppShell>
  )
}
