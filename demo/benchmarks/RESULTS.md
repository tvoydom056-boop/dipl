# Результаты бенчмарков

Дата замера: 2026-04-08 00:13:13
Источник данных: `demo/src/generated/benchmark-results.json`

## Dispatch benchmark

Сценарий: 100000 последовательных операций изменения состояния.

| Библиотека | ops/sec | Время, ms |
|---|---:|---:|
| Zustand | 153306.80 | 652.29 |
| kiks | 118807.09 | 841.70 |
| MobX | 4569.96 | 21882.04 |
| Redux Toolkit | 2988.33 | 33463.50 |

## Bundle benchmark

Сценарий: отдельная production-сборка для каждой реализации через индивидуальный entry point.

| Библиотека | Raw, kB | Gzip, kB |
|---|---:|---:|
| kiks | 205.86 | 63.90 |
| Redux Toolkit | 225.54 | 71.58 |
| Zustand | 203.41 | 63.35 |
| MobX | 263.64 | 80.31 |

## Bundle benchmark: kiks library only

Сценарий: production-сборка самого npm-пакета `packages/kiks` через `tsup` с последующим gzip-замером runtime-файлов библиотеки.

| Артефакт | Raw, kB | Gzip, kB |
|---|---:|---:|
| kiks runtime package | 4.30 | 1.99 |

## Rerender benchmark

Сценарий: автоматический benchmark в `jsdom` с монтированием каждой реализации в React `Profiler` и выполнением четырёх одинаковых действий: `addTask`, `toggleTask`, `setSearch`, `undo`.

| Библиотека | Commits | Changed components |
|---|---:|---:|
| kiks | 4 | 73 |
| Redux Toolkit | 4 | 73 |
| Zustand | 4 | 73 |
| MobX | 4 | 73 |

Детализация по сценариям для `kiks`:
- `addTask`: 1 commit, 18 changed components
- `toggleTask`: 1 commit, 19 changed components
- `setSearch`: 1 commit, 16 changed components
- `undo`: 1 commit, 20 changed components

## Замечание

Текущие bundle-метрики относятся к demo-приложению целиком для каждой отдельной реализации, а не к "чистому" размеру самих библиотек в изоляции.
Отдельный замер `kiks runtime package` показывает размер уже самой библиотеки, а не demo-приложения.
Это позволяет честно разделять две метрики:
1. размер прикладного стенда на конкретной реализации;
2. размер публикуемой библиотеки как npm-пакета.

Показатель `re-render` теперь тоже формируется автоматически, но его нужно интерпретировать как benchmark логических UI-зон и React commits в одинаковом общем интерфейсе, а не как прямой экспорт значений из браузерного DevTools.
