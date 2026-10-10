import { useState } from 'react'

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
import { en } from '../i18n/en'
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
  const [role, setRole] = useState<AppRole>('employee')
  const [tab, setTab] = useState('who')
  const config = navByRole[role]
  const activePath = shellDemoPaths[role]

  return (
    <AppShell config={config} activePath={activePath} preview>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-semibold text-ink">
            {en.designPreview.title}
          </h1>
          <p className="mt-1 text-muted">{en.designPreview.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(navByRole) as AppRole[]).map((key) => (
            <Chip key={key} active={role === key} onClick={() => setRole(key)}>
              {en.roles[key]}
            </Chip>
          ))}
        </div>
      </div>

      <Card className="mb-6">
        <p className="text-muted">{en.designPreview.placeholder}</p>
      </Card>

      <SectionHeading title={en.designPreview.componentsHeading} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionHeading title="Buttons" />
          <div className="flex flex-wrap gap-2">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="accent">Accent</Button>
          </div>
        </Card>

        <Card>
          <SectionHeading title="Badges" />
          <div className="flex flex-wrap gap-2">
            <Badge tone="teal">Thriving</Badge>
            <Badge tone="coral">Alert</Badge>
            <Badge tone="amber">At risk</Badge>
            <Badge tone="violet">Innovation</Badge>
            <Badge tone="slate">Neutral</Badge>
          </div>
        </Card>

        <Card>
          <SectionHeading title="Stats" />
          <div className="grid grid-cols-3 gap-4">
            <Stat label="Team size" value={9} delta="+1 this Q" deltaTone="up" />
            <Stat
              label="Burnout risk"
              value="72%"
              delta="+8 pts"
              deltaTone="down"
            />
            <Stat label="Morale" value="7.4" delta="stable" deltaTone="neutral" />
          </div>
        </Card>

        <Card>
          <SectionHeading title="Medallions" />
          <div className="flex flex-wrap items-end gap-4">
            <Medallion score={91} tier="gold" />
            <Medallion score={87} tier="silver" />
            <Medallion score={75} tier="bronze" />
            <Medallion score={62} tier="growth" size="sm" />
          </div>
        </Card>

        <Card>
          <SectionHeading title="Avatar + Chip + Progress" />
          <div className="flex flex-wrap items-center gap-3">
            <Avatar name="Layla Haddad" />
            <Avatar name="Yasmin Hadi" size="lg" />
            <Chip active>Pulse</Chip>
            <Chip>Wellbeing</Chip>
          </div>
          <div className="mt-4 space-y-2">
            <ProgressBar value={87} showLabel />
            <ProgressBar value={42} tone="coral" showLabel />
            <ProgressBar value={66} tone="amber" />
          </div>
        </Card>

        <Card>
          <SectionHeading title="Tabs" />
          <Tabs
            items={[
              { id: 'who', label: 'Who' },
              { id: 'why', label: 'Why' },
              { id: 'strengths', label: 'Strengths' },
              { id: 'risks', label: 'Risks' },
            ]}
            value={tab}
            onChange={setTab}
          />
          <p className="mt-3 text-muted">Selected tab: {tab}</p>
        </Card>
      </div>

      <Card className="mt-6">
        <SectionHeading
          title="Table"
          subtitle="Directory rows stay alphabetical — never ranked by score."
        />
        <Table
          columns={[
            { key: 'id', header: 'ID', mono: true, render: (r) => r.id },
            { key: 'name', header: 'Name', render: (r) => r.name },
            {
              key: 'risk',
              header: 'Risk',
              mono: true,
              render: (r) => r.risk,
            },
          ]}
          rows={sampleRows}
          rowKey={(r) => r.id}
        />
      </Card>
    </AppShell>
  )
}
