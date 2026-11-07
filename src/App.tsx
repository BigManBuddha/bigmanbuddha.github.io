import type { ComponentType } from 'react';
import type { ViewKey } from './domain/types';
import { BackupScreen } from './features/backup/BackupScreen';
import { DeleteAllPanel } from './features/backup/DeleteAllPanel';
import { CaseloadScreen } from './features/caseload/CaseloadScreen';
import { ClientPanel } from './features/caseload/ClientPanel';
import { ForecastScreen } from './features/forecast/ForecastScreen';
import { LicencePanel } from './features/licence/Licence';
import { LockScreen } from './features/lock/LockScreen';
import { MessagePanel } from './features/messages/MessagePanel';
import { MessagesScreen } from './features/messages/MessagesScreen';
import { Onboarding } from './features/onboarding/Onboarding';
import { WeeklyReview } from './features/review/WeeklyReview';
import { SettingsScreen } from './features/settings/SettingsScreen';
import { WaitlistPanel } from './features/waitlist/WaitlistPanel';
import { WaitlistScreen } from './features/waitlist/WaitlistScreen';
import { WeekScreen } from './features/week/WeekScreen';
import { AppShell } from './layout/AppShell';
import { useSlate } from './state/SlateProvider';

const SCREENS: Record<ViewKey, ComponentType> = {
  week: WeekScreen,
  caseload: CaseloadScreen,
  forecast: ForecastScreen,
  waitlist: WaitlistScreen,
  messages: MessagesScreen,
  settings: SettingsScreen,
  backup: BackupScreen,
};

/** Top level: lock screen, or the current screen plus whatever is open on top of it. */
export function App() {
  const { state } = useSlate();
  if (state.locked) return <LockScreen />;

  const Screen = SCREENS[state.view];
  return (
    <>
      <AppShell><Screen /></AppShell>
      {state.reviewStep !== null && <WeeklyReview step={state.reviewStep} />}
      {state.onboardOpen && <Onboarding />}
      <OpenPanel />
    </>
  );
}

/** The right-hand panel, if one is open. Keys make each opening start fresh. */
function OpenPanel() {
  const { panel } = useSlate().state;
  if (!panel) return null;
  switch (panel.kind) {
    case 'client': return <ClientPanel key={panel.client?.id ?? 'new'} client={panel.client} />;
    case 'waitlist': return <WaitlistPanel key={panel.entry?.id ?? 'new'} entry={panel.entry} />;
    case 'message': return <MessagePanel key={panel.message.id} message={panel.message} />;
    case 'delete-all': return <DeleteAllPanel />;
    case 'licence': return <LicencePanel key={panel.purchasedKey ?? (panel.claiming ? 'claiming' : 'licence')} panel={panel} />;
  }
}
