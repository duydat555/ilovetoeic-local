import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  History,
  Layers3,
  Loader2,
  LockKeyhole,
  RefreshCw,
  School,
  SlidersHorizontal,
} from 'lucide-react';
import {
  FEATURE_CATEGORIES,
  FEATURE_DEFINITIONS,
  FeatureDefinition,
  FeatureKey,
  featureDefinitionByKey,
} from '../../config/features';
import { BoneyardSkeleton } from '../../components/common/BoneyardSkeleton';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';
import {
  FeatureAdminConfiguration,
  backendService,
} from '../../services/backend';
import { DialogShell, PageHeader } from '../../components/management/ManagementUI';

type ViewTab = 'configuration' | 'history';
type ScopeMode = 'global' | 'class';
type ToastState = { tone: 'success' | 'error'; message: string } | null;

interface PendingDisable {
  scope: ScopeMode;
  classId?: string;
  feature: FeatureDefinition;
  impactCount: number;
}

interface FeatureToggleProps {
  checked: boolean;
  disabled?: boolean;
  busy?: boolean;
  label: string;
  onChange?: (enabled: boolean) => void;
}

const FeatureToggle: React.FC<FeatureToggleProps> = ({
  checked,
  disabled = false,
  busy = false,
  label,
  onChange,
}) => (
  <span className="inline-flex items-center gap-2">
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      data-state={checked ? 'on' : 'off'}
      disabled={disabled || busy}
      onClick={() => onChange?.(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border border-transparent p-0 outline-none transition-colors duration-200 focus-visible:ring-4 focus-visible:ring-accent/20 motion-reduce:transition-none ${
        checked
          ? 'bg-accent'
          : 'bg-slate-300 dark:bg-slate-600'
      } ${disabled || busy ? 'cursor-not-allowed opacity-70' : 'cursor-pointer active:scale-[.98]'}`}
    >
      <span
        aria-hidden="true"
        data-switch-thumb
        className={`pointer-events-none absolute left-1 top-1 grid size-5 place-items-center rounded-full bg-white text-brand-800 shadow-sm transition-transform duration-200 ease-out motion-reduce:transition-none ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      >
        {busy ? <Loader2 className="size-3 animate-spin motion-reduce:animate-none" /> : null}
      </span>
    </button>
    {disabled && (
      <span
        title="Tính năng bắt buộc"
        aria-label="Tính năng bắt buộc"
        className="grid size-7 place-items-center rounded-lg bg-surface-hover text-content-muted"
      >
        <LockKeyhole className="size-3.5" />
      </span>
    )}
  </span>
);

const FeatureIdentity: React.FC<{ feature: FeatureDefinition; compact?: boolean }> = ({
  feature,
  compact = false,
}) => {
  const Icon = feature.icon;
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className={`${compact ? 'size-9' : 'size-10'} grid shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300`}>
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-extrabold text-content">{feature.name}</p>
        {!compact && (
          <p className="mt-0.5 max-w-xl text-xs leading-relaxed text-content-muted">
            {feature.description}
          </p>
        )}
      </div>
    </div>
  );
};

const LoadingState = () => (
  <div className="space-y-4" aria-label="Đang tải cấu hình tính năng" role="status">
    <BoneyardSkeleton name="feature-header-skeleton" height={96} />
    <BoneyardSkeleton name="feature-cards-skeleton" variant="card" count={3} height={144} />
  </div>
);

const formatDateTime = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value || 'Không xác định';
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(parsed);
};

export const FeatureManagementPage: React.FC = () => {
  const { reload: reloadFeatureFlags } = useFeatureFlags();
  const [configuration, setConfiguration] = useState<FeatureAdminConfiguration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [tab, setTab] = useState<ViewTab>('configuration');
  const [scopeMode, setScopeMode] = useState<ScopeMode>('global');
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [expandedClassId, setExpandedClassId] = useState('');
  const [busyKey, setBusyKey] = useState('');
  const [pendingDisable, setPendingDisable] = useState<PendingDisable | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  const loadConfiguration = useCallback(async (preserveSelection = true) => {
    setIsLoading(true);
    setLoadError('');
    try {
      const data = await backendService.getFeatureConfiguration();
      setConfiguration(data);
      setSelectedClassIds((current) => {
        if (preserveSelection && current.length > 0) {
          const validIds = new Set(data.classes.map((item) => item.id));
          const next = current.filter((id) => validIds.has(id));
          if (next.length > 0) return next;
        }
        const activeIds = data.classes.filter((item) => item.isActive).map((item) => item.id);
        return activeIds.length > 0 ? activeIds : data.classes.map((item) => item.id);
      });
      setExpandedClassId((current) => current || data.classes[0]?.id || '');
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Không thể tải cấu hình tính năng.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConfiguration(false);
  }, [loadConfiguration]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const selectedClasses = useMemo(() => {
    if (!configuration) return [];
    const selected = new Set(selectedClassIds);
    return configuration.classes.filter((item) => selected.has(item.id));
  }, [configuration, selectedClassIds]);

  const enabledGlobalCount = useMemo(() => (
    configuration
      ? FEATURE_DEFINITIONS.filter((feature) => configuration.globalFlags[feature.key]).length
      : 0
  ), [configuration]);

  const classFeatureEnabled = useCallback((classId: string, featureKey: FeatureKey) => {
    if (!configuration) return true;
    return configuration.classOverrides[classId]?.[featureKey]
      ?? configuration.globalFlags[featureKey]
      ?? true;
  }, [configuration]);

  const impactFor = useCallback((scope: ScopeMode, featureKey: FeatureKey, classId = '') => {
    if (!configuration) return 0;
    return scope === 'global'
      ? configuration.impactCounts.global[featureKey] || 0
      : configuration.impactCounts.classes[classId]?.[featureKey] || 0;
  }, [configuration]);

  const commitToggle = useCallback(async (
    scope: ScopeMode,
    feature: FeatureDefinition,
    enabled: boolean,
    classId = '',
    confirmed = false,
  ) => {
    const operationKey = `${scope}:${classId}:${feature.key}`;
    setBusyKey(operationKey);
    try {
      if (scope === 'global') {
        await backendService.updateGlobalFeature(feature.key, enabled, confirmed);
      } else {
        await backendService.updateClassFeature(classId, feature.key, enabled, confirmed);
      }
      await loadConfiguration();
      void reloadFeatureFlags();
      setToast({
        tone: 'success',
        message: `${enabled ? 'Đã bật' : 'Đã tắt'} ${feature.name}${scope === 'class' ? ' cho lớp đã chọn' : ' trên toàn hệ thống'}.`,
      });
    } catch (error) {
      setToast({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Không thể cập nhật tính năng.',
      });
    } finally {
      setBusyKey('');
    }
  }, [loadConfiguration]);

  const requestToggle = (
    scope: ScopeMode,
    feature: FeatureDefinition,
    enabled: boolean,
    classId = '',
  ) => {
    if (feature.core) return;
    const impactCount = enabled ? 0 : impactFor(scope, feature.key, classId);
    if (!enabled && impactCount > 0) {
      setPendingDisable({ scope, classId: classId || undefined, feature, impactCount });
      return;
    }
    void commitToggle(scope, feature, enabled, classId);
  };

  const toggleClassSelection = (classId: string) => {
    setSelectedClassIds((current) => (
      current.includes(classId)
        ? current.filter((id) => id !== classId)
        : [...current, classId]
    ));
  };

  if (isLoading && !configuration) {
    return <LoadingState />;
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6 pb-8">
      <PageHeader
        title="Quản lý tính năng"
        description="Kiểm soát những khu vực học sinh được sử dụng trên toàn hệ thống hoặc theo từng lớp."
        action={(
          <button
            type="button"
            onClick={() => void loadConfiguration()}
            disabled={isLoading}
            className="btn-secondary min-h-11 whitespace-nowrap text-sm active:translate-y-px"
          >
            <RefreshCw className={`size-4 ${isLoading ? 'animate-spin motion-reduce:animate-none' : ''}`} />
            Làm mới
          </button>
        )}
      />

      {loadError && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-500/10">
          <p className="text-sm font-semibold text-red-700 dark:text-red-300">{loadError}</p>
          <button type="button" onClick={() => void loadConfiguration()} className="btn-secondary text-sm">
            Thử lại
          </button>
        </section>
      )}

      {configuration && (
        <>
          <section className="rounded-2xl border border-line bg-surface p-4 shadow-sm dark:shadow-none sm:p-5">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center">
                <div className="flex items-center gap-3 rounded-xl bg-surface-elevated px-3.5 py-3">
                  <span className="grid size-9 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                    <Layers3 className="size-4" />
                  </span>
                  <div>
                    <p className="text-lg font-black text-content">{enabledGlobalCount}/{FEATURE_DEFINITIONS.length}</p>
                    <p className="text-[11px] font-semibold text-content-muted">Đang bật global</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-surface-elevated px-3.5 py-3">
                  <span className="grid size-9 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                    <School className="size-4" />
                  </span>
                  <div>
                    <p className="text-lg font-black text-content">{configuration.classes.length}</p>
                    <p className="text-[11px] font-semibold text-content-muted">Lớp có thể cấu hình</p>
                  </div>
                </div>
              </div>

              <div className="inline-flex w-full rounded-xl bg-surface-elevated p-1 sm:w-auto" role="tablist" aria-label="Nội dung quản lý tính năng">
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'configuration'}
                  onClick={() => setTab('configuration')}
                  className={`flex min-h-10 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 text-sm font-extrabold transition sm:flex-none ${tab === 'configuration' ? 'bg-surface text-content shadow-sm' : 'text-content-muted hover:text-content'}`}
                >
                  <SlidersHorizontal className="size-4" /> Cấu hình
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'history'}
                  onClick={() => setTab('history')}
                  className={`flex min-h-10 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 text-sm font-extrabold transition sm:flex-none ${tab === 'history' ? 'bg-surface text-content shadow-sm' : 'text-content-muted hover:text-content'}`}
                >
                  <History className="size-4" /> Lịch sử thay đổi
                </button>
              </div>
            </div>
          </section>

          {tab === 'configuration' ? (
            <div className="space-y-5">
              <section className="rounded-2xl border border-line bg-surface p-4 shadow-sm dark:shadow-none sm:p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div>
                    <h2 className="text-base font-extrabold text-content">Phạm vi áp dụng</h2>
                    <p className="mt-1 text-sm text-content-muted">Chọn một cấu hình chung hoặc điều chỉnh riêng cho từng lớp.</p>
                  </div>
                  <div className="inline-flex w-full rounded-xl bg-surface-elevated p-1 md:w-auto" role="radiogroup" aria-label="Phạm vi cấu hình">
                    {([
                      ['global', 'Toàn hệ thống'],
                      ['class', 'Theo từng lớp'],
                    ] as const).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={scopeMode === value}
                        onClick={() => setScopeMode(value)}
                        className={`min-h-10 flex-1 whitespace-nowrap rounded-lg px-4 text-sm font-extrabold transition md:flex-none ${scopeMode === value ? 'bg-brand text-brand-ink shadow-sm' : 'text-content-muted hover:text-content'}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {scopeMode === 'class' && (
                  <details className="relative mt-4 w-full max-w-md">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-xl border border-line bg-surface px-3.5 text-sm font-bold text-content outline-none transition hover:bg-surface-hover focus-visible:ring-4 focus-visible:ring-accent/10">
                      <span className="truncate">
                        {selectedClassIds.length > 0
                          ? `Đã chọn ${selectedClassIds.length} lớp`
                          : 'Chọn lớp để cấu hình'}
                      </span>
                      <ChevronDown className="size-4 shrink-0 text-content-muted" />
                    </summary>
                    <div className="absolute left-0 top-[calc(100%+8px)] z-30 w-full overflow-hidden rounded-2xl border border-line bg-surface p-2 shadow-xl dark:shadow-none">
                      <div className="flex items-center justify-between border-b border-line px-2 pb-2">
                        <button type="button" onClick={() => setSelectedClassIds(configuration.classes.map((item) => item.id))} className="text-xs font-extrabold text-accent-strong hover:underline">
                          Chọn tất cả
                        </button>
                        <button type="button" onClick={() => setSelectedClassIds([])} className="text-xs font-bold text-content-muted hover:text-content">
                          Bỏ chọn
                        </button>
                      </div>
                      <div className="max-h-64 overflow-y-auto py-1">
                        {configuration.classes.map((classItem) => {
                          const selected = selectedClassIds.includes(classItem.id);
                          return (
                            <label key={classItem.id} className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-surface-hover">
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => toggleClassSelection(classItem.id)}
                                className="peer sr-only"
                              />
                              <span className={`grid size-5 place-items-center rounded-md border transition ${selected ? 'border-brand bg-brand text-brand-ink' : 'border-line bg-surface'}`}>
                                {selected && <Check className="size-3.5" />}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-bold text-content">{classItem.name}</span>
                                <span className="block text-[11px] text-content-muted">{classItem.code}</span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </details>
                )}
              </section>

              {scopeMode === 'global' ? (
                <div className="space-y-5">
                  {FEATURE_CATEGORIES.map((category) => {
                    const features = FEATURE_DEFINITIONS.filter((feature) => feature.category === category.key);
                    return (
                      <section key={category.key} className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm dark:shadow-none">
                        <header className="border-b border-line bg-surface-elevated px-4 py-3.5 sm:px-5">
                          <h2 className="text-sm font-extrabold text-content">{category.name}</h2>
                          <p className="mt-0.5 text-xs text-content-muted">{category.description}</p>
                        </header>
                        <div className="divide-y divide-line">
                          {features.map((feature) => {
                            const checked = configuration.globalFlags[feature.key] !== false;
                            const operationKey = `global::${feature.key}`;
                            return (
                              <div key={feature.key} className="flex items-center justify-between gap-4 px-4 py-4 sm:px-5">
                                <FeatureIdentity feature={feature} />
                                <FeatureToggle
                                  checked={checked}
                                  disabled={feature.core}
                                  busy={busyKey === operationKey}
                                  label={`${checked ? 'Tắt' : 'Bật'} ${feature.name} trên toàn hệ thống`}
                                  onChange={(enabled) => requestToggle('global', feature, enabled)}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    );
                  })}
                </div>
              ) : selectedClasses.length > 0 ? (
                <>
                  <section className="hidden overflow-x-auto rounded-2xl border border-line bg-surface shadow-sm dark:shadow-none md:block">
                    <table className="w-full min-w-[760px] border-collapse text-left">
                      <thead>
                        <tr className="border-b border-line bg-surface-elevated">
                          <th className="sticky left-0 min-w-72 bg-surface-elevated px-5 py-4 text-xs font-extrabold text-content">Tính năng</th>
                          {selectedClasses.map((classItem) => (
                            <th key={classItem.id} className="min-w-40 px-4 py-4 text-center">
                              <span className="block truncate text-xs font-extrabold text-content">{classItem.name}</span>
                              <span className="mt-0.5 block text-[10px] font-semibold text-content-muted">{classItem.code}</span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {FEATURE_CATEGORIES.map((category) => (
                          <React.Fragment key={category.key}>
                            <tr className="border-b border-line bg-surface-hover/60">
                              <th colSpan={selectedClasses.length + 1} className="px-5 py-2.5 text-[11px] font-extrabold text-content-muted">
                                {category.name}
                              </th>
                            </tr>
                            {FEATURE_DEFINITIONS.filter((feature) => feature.category === category.key).map((feature) => (
                              <tr key={feature.key} className="border-b border-line last:border-b-0">
                                <th className="sticky left-0 bg-surface px-5 py-3.5 font-normal">
                                  <FeatureIdentity feature={feature} compact />
                                </th>
                                {selectedClasses.map((classItem) => {
                                  const checked = classFeatureEnabled(classItem.id, feature.key);
                                  const operationKey = `class:${classItem.id}:${feature.key}`;
                                  return (
                                    <td key={classItem.id} className="px-4 py-3.5 text-center">
                                      <FeatureToggle
                                        checked={checked}
                                        disabled={feature.core}
                                        busy={busyKey === operationKey}
                                        label={`${checked ? 'Tắt' : 'Bật'} ${feature.name} cho lớp ${classItem.name}`}
                                        onChange={(enabled) => requestToggle('class', feature, enabled, classItem.id)}
                                      />
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </section>

                  <div className="space-y-3 md:hidden">
                    {selectedClasses.map((classItem) => {
                      const expanded = expandedClassId === classItem.id;
                      return (
                        <section key={classItem.id} className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm dark:shadow-none">
                          <button
                            type="button"
                            aria-expanded={expanded}
                            onClick={() => setExpandedClassId(expanded ? '' : classItem.id)}
                            className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-extrabold text-content">{classItem.name}</span>
                              <span className="mt-0.5 block text-xs text-content-muted">{classItem.code}</span>
                            </span>
                            <ChevronRight className={`size-4 shrink-0 text-content-muted transition-transform ${expanded ? 'rotate-90' : ''}`} />
                          </button>
                          {expanded && (
                            <div className="divide-y divide-line border-t border-line">
                              {FEATURE_DEFINITIONS.map((feature) => {
                                const checked = classFeatureEnabled(classItem.id, feature.key);
                                const operationKey = `class:${classItem.id}:${feature.key}`;
                                return (
                                  <div key={feature.key} className="flex items-center justify-between gap-3 px-4 py-3.5">
                                    <FeatureIdentity feature={feature} compact />
                                    <FeatureToggle
                                      checked={checked}
                                      disabled={feature.core}
                                      busy={busyKey === operationKey}
                                      label={`${checked ? 'Tắt' : 'Bật'} ${feature.name} cho lớp ${classItem.name}`}
                                      onChange={(enabled) => requestToggle('class', feature, enabled, classItem.id)}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </section>
                      );
                    })}
                  </div>
                </>
              ) : (
                <section className="grid min-h-56 place-items-center rounded-2xl border border-dashed border-line bg-surface px-5 text-center">
                  <div className="max-w-sm">
                    <School className="mx-auto size-8 text-content-muted" />
                    <h2 className="mt-3 text-base font-extrabold text-content">Chưa chọn lớp</h2>
                    <p className="mt-1 text-sm text-content-muted">Chọn ít nhất một lớp ở phía trên để mở ma trận cấu hình.</p>
                  </div>
                </section>
              )}
            </div>
          ) : (
            <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm dark:shadow-none">
              <header className="border-b border-line px-4 py-4 sm:px-5">
                <h2 className="text-base font-extrabold text-content">Lịch sử thay đổi</h2>
                <p className="mt-1 text-sm text-content-muted">150 thay đổi gần nhất, sắp xếp từ mới đến cũ.</p>
              </header>
              {configuration.history.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[820px] text-left">
                    <thead className="bg-surface-elevated text-[11px] font-extrabold text-content-muted">
                      <tr>
                        <th className="px-5 py-3">Thời gian</th>
                        <th className="px-5 py-3">Người thực hiện</th>
                        <th className="px-5 py-3">Tính năng</th>
                        <th className="px-5 py-3">Phạm vi</th>
                        <th className="px-5 py-3">Thay đổi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {configuration.history.map((entry) => {
                        const feature = featureDefinitionByKey.get(entry.featureKey);
                        return (
                          <tr key={entry.id}>
                            <td className="whitespace-nowrap px-5 py-3.5 text-xs font-semibold text-content-muted">
                              <span className="inline-flex items-center gap-2"><Clock3 className="size-3.5" />{formatDateTime(entry.createdAt)}</span>
                            </td>
                            <td className="px-5 py-3.5">
                              <p className="text-sm font-bold text-content">{entry.actorName}</p>
                              <p className="mt-0.5 text-[11px] text-content-muted">{entry.actorEmail}</p>
                            </td>
                            <td className="px-5 py-3.5 text-sm font-bold text-content">{feature?.name || entry.featureKey}</td>
                            <td className="px-5 py-3.5 text-sm text-content-muted">{entry.scopeType === 'global' ? 'Toàn hệ thống' : entry.className || 'Lớp đã xoá'}</td>
                            <td className="px-5 py-3.5">
                              <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-extrabold ${entry.newEnabled ? 'border-brand-200 bg-brand-50 text-brand-800 dark:border-brand-700 dark:bg-brand-500/10 dark:text-brand-300' : 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-500/10 dark:text-slate-300'}`}>
                                {entry.newEnabled ? 'Đã bật' : 'Đã tắt'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="grid min-h-56 place-items-center px-5 text-center">
                  <div>
                    <History className="mx-auto size-8 text-content-muted" />
                    <h3 className="mt-3 text-base font-extrabold text-content">Chưa có thay đổi</h3>
                    <p className="mt-1 text-sm text-content-muted">Lịch sử sẽ xuất hiện sau lần bật hoặc tắt đầu tiên.</p>
                  </div>
                </div>
              )}
            </section>
          )}
        </>
      )}

      <DialogShell
        open={Boolean(pendingDisable)}
        title="Xác nhận tắt tính năng"
        description="Dữ liệu hiện có sẽ được giữ nguyên."
        onClose={() => {
          if (!busyKey) setPendingDisable(null);
        }}
        maxWidth="max-w-lg"
        footer={(
          <>
            <button type="button" onClick={() => setPendingDisable(null)} disabled={Boolean(busyKey)} className="btn-secondary min-h-11 px-4 text-sm">
              Huỷ
            </button>
            <button
              type="button"
              disabled={!pendingDisable || Boolean(busyKey)}
              onClick={() => {
                if (!pendingDisable) return;
                const target = pendingDisable;
                setPendingDisable(null);
                void commitToggle(target.scope, target.feature, false, target.classId || '', true);
              }}
              className="inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-red-600 px-4 text-sm font-extrabold text-white transition hover:bg-red-700 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
            >
              Xác nhận tắt
            </button>
          </>
        )}
      >
        {pendingDisable && (
          <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-500/10">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
              <AlertTriangle className="size-5" />
            </span>
            <div>
              <p className="text-sm font-bold leading-relaxed text-amber-900 dark:text-amber-100">
                Tắt tính năng này sẽ ẩn {pendingDisable.feature.name} khỏi giao diện học sinh nhưng không xoá dữ liệu. Bạn có chắc muốn tiếp tục?
              </p>
              <p className="mt-2 text-xs font-semibold text-amber-800/80 dark:text-amber-200/80">
                Phát hiện {pendingDisable.impactCount} bản ghi học sinh đang liên quan đến tính năng này.
              </p>
            </div>
          </div>
        )}
      </DialogShell>

      {toast && (
        <div
          role="status"
          className={`fixed bottom-24 right-4 z-[90] max-w-sm rounded-xl border px-4 py-3 text-sm font-bold shadow-xl md:bottom-5 ${toast.tone === 'success' ? 'border-brand-200 bg-brand-50 text-brand-900 dark:border-brand-800 dark:bg-brand-950 dark:text-brand-100' : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200'}`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
};
