/*
* Tencent is pleased to support the open source community by making
* 蓝鲸智云PaaS平台社区版 (BlueKing PaaS Community Edition) available.
*
* Copyright (C) 2021 THL A29 Limited, a Tencent company.  All rights reserved.
*
* 蓝鲸智云PaaS平台社区版 (BlueKing PaaS Community Edition) is licensed under the MIT License.
*
* License for 蓝鲸智云PaaS平台社区版 (BlueKing PaaS Community Edition):
*
* ---------------------------------------------------
* Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
* documentation files (the "Software"), to deal in the Software without restriction, including without limitation
* the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and
* to permit persons to whom the Software is furnished to do so, subject to the following conditions:
*
* The above copyright notice and this permission notice shall be included in all copies or substantial portions of
* the Software.
*
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
* THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
* CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
* IN THE SOFTWARE.
*/

// import type { Placement } from '@popperjs/core';
// import { bkZIndexManager, BKPopover, IBKPopover } from '@bkui-vue/shared';
import { toDate } from 'date-fns';
import type { ExtractPropTypes } from 'vue';
import {
  computed,
  defineComponent,
  getCurrentInstance,
  nextTick,
  PropType,
  provide,
  reactive,
  ref,
  toRefs,
  watch,
} from 'vue';

import { useLocale, usePrefix } from '@bkui-vue/config-provider';
import { AngleDoubleLeft, AngleDoubleRight, AngleLeft, AngleRight } from '@bkui-vue/icon';

import Confirm from '../base/confirm';
import DateTable from '../base/date-table';
import type {
  DatePickerShortcutsType,
  DatePickerValueType,
  DisabledDateType,
  PickerTypeType,
  SelectionModeType,
} from '../interface';
import { formatDateLabels, iconBtnCls, initTime, timePickerKey } from '../utils';

import TimeRange from './time-range';
// import MonthTable from '../base/month-table';
// import YearTable from '../base/year-table';

const dateRangePanelProps = {
  modelValue: {
    type: [Date, String, Number, Array] as PropType<DatePickerValueType | null>,
  },
  type: {
    type: String as PropType<PickerTypeType>,
    default: 'date',
    validator(value) {
      const validList: PickerTypeType[] = ['year', 'month', 'date', 'daterange', 'datetime', 'datetimerange', 'time', 'timerange'];
      if (validList.indexOf(value) < 0) {
        console.error(`type property is not valid: '${value}'`);
        return false;
      }
      return true;
    },
  },
  shortcuts: {
    type: Array as PropType<DatePickerShortcutsType>,
    default: () => [],
  },
  shortcutClose: {
    type: Boolean,
    default: false,
  },
  clearable: {
    type: Boolean,
    default: true,
  },
  splitPanels: {
    type: Boolean,
    default: true,
  },
  showTime: {
    type: Boolean,
    default: false,
  },
  selectionMode: {
    type: String as PropType<SelectionModeType>,
    default: 'date',
    validator(v) {
      if (['year', 'month', 'date', 'time'].indexOf(v) < 0) {
        console.error(`selectionMode property is not valid: '${v}'`);
        return false;
      }
      return true;
    },
  },
  startDate: {
    type: Date,
  },
  // 结束时间是否允许“至今”
  upToNow: {
    type: Boolean,
    default: false,
  },
  disabledDate: Function as PropType<DisabledDateType>,
  focusedDate: {
    type: Date,
    required: true,
  },
  confirm: {
    type: Boolean,
    default: false,
  },
  format: {
    type: String,
    default: 'yyyy-MM-dd',
  },
  timePickerOptions: {
    type: Object as PropType<Record<string, any>>,
    default: () => ({}),
  },
  shortcutSelectedIndex: {
    type: Number,
    default: -1,
  },
} as const;

export type DateRangePanelProps = Readonly<ExtractPropTypes<typeof dateRangePanelProps>>;

export default defineComponent({
  name: 'DateRangePanel',
  props: dateRangePanelProps,
  emits: ['pick', 'pick-success', 'pick-clear', 'pick-click', 'pick-first'],
  setup(props, { slots, emit }) {
    const t = useLocale('datePicker');
    const [minDate, maxDate] = (props.modelValue as any).map(date => date || initTime());
    const leftPanelDate = props.startDate ? props.startDate : minDate;

    const state = reactive({
      currentView: props.selectionMode || 'date',
      leftPickerTable: `${props.selectionMode}-table`,
      rightPickerTable: `${props.selectionMode}-table`,
      leftPanelDate,
      rightPanelDate: new Date(leftPanelDate.getFullYear(), leftPanelDate.getMonth() + 1, 1),
      rangeState: { from: props.modelValue[0], to: props.modelValue[1], selecting: minDate && !maxDate },
      // 判断 range 中，第一次选的时间是否晚于当前时间
      upToNowEnable: false,
      dates: props.modelValue as any,
      selectedIndex: props.shortcutSelectedIndex,
      // pickerTable: getTableType(props.selectionMode),
      // dates,
      // panelDate: props.startDate || dates[0] || new Date(),
    });

    const { proxy } = getCurrentInstance();
    provide(timePickerKey, {
      dates: state.dates,
      parentName: proxy.$options.name,
    });

    const dateSorter = (a, b) => {
      if (!a || !b) {
        return 0;
      }
      return a.getTime() - b.getTime();
    };

    const reset = () => {
      state.currentView = props.selectionMode;
      state.leftPickerTable = `${state.currentView}-table`;
      state.rightPickerTable = `${state.currentView}-table`;
    };

    const timeSpinner = ref(null);
    const timeSpinnerEnd = ref(null);

    const onToggleVisibility = (open) => {
      if (open) {
        timeSpinner?.value?.updateScroll();
        timeSpinnerEnd?.value?.updateScroll();
      }
    };

    const changePanelDate = (panel, type, increment, updateOtherPanel = true) => {
      const current = new Date(state[`${panel}PanelDate`]);
      current[`set${type}`](current[`get${type}`]() + increment);
      state[`${panel}PanelDate`] = current;

      if (!updateOtherPanel) {
        return;
      }

      if (props.splitPanels) {
        const otherPanel = panel === 'left' ? 'right' : 'left';
        if (panel === 'left' && state.leftPanelDate >= state.rightPanelDate) {
          changePanelDate(otherPanel, type, 1);
        }
        if (panel === 'right' && state.rightPanelDate <= state.leftPanelDate) {
          changePanelDate(otherPanel, type, -1);
        }
      } else {
        const otherPanel = panel === 'left' ? 'right' : 'left';
        const currentDate = state[`${otherPanel}PanelDate`];
        const temp = new Date(currentDate);

        if (type === 'Month') {
          const nextMonthLastDate = new Date(temp.getFullYear(), temp.getMonth() + increment + 1, 0).getDate();
          temp.setDate(Math.min(nextMonthLastDate, temp.getDate()));
        }

        temp[`set${type}`](temp[`get${type}`]() + increment);
        state[`${otherPanel}PanelDate`] = temp;
      }
    };

    /**
     * prevYear
     */
    const prevYear = (panel) => {
      const increment = state.currentView === 'year' ? -10 : -1;
      changePanelDate(panel, 'FullYear', increment);
    };

    /**
     * nextYear
     */
    const nextYear = (panel) => {
      const increment = state.currentView === 'year' ? 10 : 1;
      changePanelDate(panel, 'FullYear', increment);
    };

    /**
     * prevMonth
     */
    const prevMonth = (panel) => {
      changePanelDate(panel, 'Month', -1);
    };

    /**
     * nextMonth
     */
    const nextMonth = (panel) => {
      changePanelDate(panel, 'Month', 1);
    };

    /**
     * showYearPicker
     */
    const showYearPicker = (panel) => {
      state[`${panel}PickerTable`] = 'year-table';
    };

    /**
     * showMonthPicker
     */
    const showMonthPicker = (panel) => {
      state[`${panel}PickerTable`] = 'month-table';
    };

    /**
     * panelLabelConfig
     */
    const panelLabelConfig = (direction) => {
      const locale = 'zh-CN';
      const datePanelLabel = '[yyyy]-[mm]';
      const date = state[`${direction}PanelDate`];

      const { labels, separator } = formatDateLabels(locale, datePanelLabel, date);
      const handler = (type) => {
        const fn = type === 'month' ? showMonthPicker : showYearPicker;
        return () => fn(direction);
      };


      return {
        separator,
        labels: labels.map((obj: any) => {
          const ret = obj;
          ret.handler = handler(obj.type);
          return ret;
        }),
      };
    };

    /**
     * handleConfirm
     */
    const handleConfirm = (visible, type) => {
      emit('pick', state.dates, visible, type || props.type);
    };

    /**
     * handleRangePick
     */
    const handleRangePick = (val, type) => {
      if (!state.rangeState.selecting) {
        emit('pick-first', val, state.currentView);
      }
      // debugger;
      if (state.rangeState.selecting || state.currentView === 'time') {
        if (state.currentView === 'time') {
          state.dates = val;
        } else {
          const [minDate, maxDate] = [state.rangeState.from, val].sort(dateSorter);
          const maxDateLastMoment = type === 'upToNow'
            // upToNow 时，结束的时间为当前时间
            ? new Date()
            // 结束的时间 不是 00:00:00，改为 23:59:59
            : new Date(new Date(new Date(maxDate.setHours(23)).setMinutes(59)).setSeconds(59));
          state.dates = [minDate, maxDateLastMoment];
          state.rangeState = {
            from: minDate,
            to: maxDateLastMoment,
            selecting: false,
          };
        }
        handleConfirm(false, type || 'date');
      } else {
        state.upToNowEnable = new Date(val).getTime() < new Date().getTime();
        state.rangeState = {
          from: val,
          to: null,
          selecting: true,
        };
      }
    };

    /**
     * 点击左侧面板以及右侧面板的年视图或者月视图
     *
     * @param {string} panelPosition 左侧 panel 还是右侧 panel
     * @param {Date} value 选中的值，如果是年视图，那么就是选中年的一月一号，如果是月视图，那么就是选中月的一号
     */
    const handlePreSelection = (panelPosition, value) => {
      state[`${panelPosition}PanelDate`] = value;
      const currentViewType = state[`${panelPosition}PickerTable`];
      if (currentViewType === 'year-table') {
        state[`${panelPosition}PickerTable`] = 'month-table';
      } else {
        state[`${panelPosition}PickerTable`] = `${state.currentView}-table`;
      }

      if (!props.splitPanels) {
        const otherPanel = panelPosition === 'left' ? 'right' : 'left';
        state[`${otherPanel}PanelDate`] = value;

        const increment = otherPanel === 'left' ? -1 : 1;

        changePanelDate(otherPanel, 'Month', increment, false);
      }
    };
    const handleShortcutClick = (shortcut, index) => {
      if (!shortcut?.value) {
        return false;
      }
      if (shortcut.onClick) {
        shortcut.onClick(shortcut, index);
      }
      const value = typeof shortcut.value === 'function' ? shortcut.value() : shortcut.value;
      const [form, to] = value;
      state.rangeState.from = form;
      state.rangeState.to = to;
      state.dates = [form, to];
      state.selectedIndex = index;
      emit('pick', value, false, 'shortcut', shortcut);
      if (props.shortcutClose) {
        emit('pick-success');
      }
    };

    const handleChangeRange = (val) => {
      state.rangeState.to = val;
    };

    function setPanelDates(leftPanelDate) {
      state.leftPanelDate = leftPanelDate;
      const rightPanelDate = new Date(leftPanelDate.getFullYear(), leftPanelDate.getMonth() + 1, 1);
      const splitRightPanelDate = state.dates[1] ? state.dates[1].getTime() : state.dates[1];
      state.rightPanelDate = props.splitPanels
        ? new Date(Math.max(splitRightPanelDate, rightPanelDate.getTime()))
        : rightPanelDate;
    }

    watch(() => props.selectionMode, (v) => {
      state.currentView = (v || 'range') as SelectionModeType;
    });

    watch(() => props.modelValue, (newVal) => {
      const minDate = newVal[0] ? toDate(newVal[0]) : null;
      const maxDate = newVal[1] ? toDate(newVal[1]) : null;
      state.dates = [minDate, maxDate].sort(dateSorter);

      state.rangeState = {
        from: state.dates[0],
        to: state.dates[1],
        selecting: false,
      };

      setPanelDates(props.startDate || state.dates[0] || new Date());
    });

    watch(() => state.currentView, (v) => {
      const leftMonth = state.leftPanelDate.getMonth();
      const rightMonth = state.rightPanelDate.getMonth();
      const isSameYear = state.leftPanelDate.getFullYear() === state.rightPanelDate.getFullYear();

      if (v === 'date' && isSameYear && leftMonth === rightMonth) {
        changePanelDate('right', 'Month', 1);
      }
      if (v === 'month' && isSameYear) {
        changePanelDate('right', 'FullYear', 1);
      }
      if (v === 'year' && isSameYear) {
        changePanelDate('right', 'FullYear', 10);
      }

      if (state.currentView === 'time') {
        nextTick(() => {
          timePickerRef.value.updateScroll();
        });
      }
    });

    const isTime = computed(() => state.currentView === 'time');

    const leftDatePanelLabel = computed(() => panelLabelConfig('left'));
    const rightDatePanelLabel = computed(() => panelLabelConfig('right'));

    const leftDatePanelView = computed(() => state.leftPickerTable.split('-').shift());
    const rightDatePanelView = computed(() => state.rightPickerTable.split('-').shift());

    const leftShowLabelFirst = computed(() => leftDatePanelLabel.value.labels[0].type === 'year' || state.currentView === 'date');
    const leftShowLabelSecond = computed(() => leftDatePanelLabel.value.labels[1].type === 'year' || state.currentView === 'date');

    const rightShowLabelFirst = computed(() => rightDatePanelLabel.value.labels[0].type === 'year' || state.currentView === 'date');
    const rightShowLabelSecond = computed(() => rightDatePanelLabel.value.labels[1].type === 'year' || state.currentView === 'date');

    const preSelecting = computed(() => {
      const tableType = `${state.currentView}-table`;

      return {
        left: state.leftPickerTable !== tableType,
        right: state.rightPickerTable !== tableType,
      };
    });

    const panelPickerHandlers = computed(() => ({
      left: preSelecting.value.left ? handlePreSelection.bind('left') : handleRangePick,
      right: preSelecting.value.right ? handlePreSelection.bind('right') : handleRangePick,
    }));

    const hasShortcuts = computed(() => slots.shortcuts || props.shortcuts?.length);

    const handleToggleTime = () => {
      state.currentView = state.currentView === 'time' ? 'date' : 'time';
    };

    const resetView = () => {
      setTimeout(
        () => {
          state.currentView = props.selectionMode;
        },
        500,
      );
    };

    const handlePickSuccess = () => {
      resetView();
      emit('pick-success');
    };

    const handlePickClear = () => {
      resetView();
      emit('pick-clear');
    };

    function handlePickClick() {
      emit('pick-click');
    }


    const timeDisabled = computed(() => !(state.dates[0] && state.dates[1]));

    const timePickerRef = ref(null);

    const { resolveClassName } = usePrefix();

    return {
      ...toRefs(state),
      isTime,
      hasShortcuts,
      prevYear,
      nextYear,
      prevMonth,
      nextMonth,
      leftDatePanelLabel,
      rightDatePanelLabel,
      leftDatePanelView,
      rightDatePanelView,
      leftShowLabelFirst,
      leftShowLabelSecond,
      rightShowLabelFirst,
      rightShowLabelSecond,
      preSelecting,
      panelPickerHandlers,
      timeDisabled,

      handleShortcutClick,
      reset,
      onToggleVisibility,
      handleRangePick,
      handleChangeRange,
      handleToggleTime,
      handlePickSuccess,
      handlePickClear,
      handlePickClick,

      timePickerRef,
      t,
      resolveClassName,
    };
  },
  render() {
    let shortcuts = null;
    if (this.hasShortcuts) {
      let inner: any = '';
      if (this.$slots.shortcuts) {
        inner = typeof this.$slots.shortcuts === 'function' ? this.$slots.shortcuts() : this.$slots.shortcuts;
      } else {
        if (this.shortcuts.length) {
          inner = (
            <div class={this.resolveClassName('picker-panel-shortcuts')}>
              {
                this.shortcuts.map((item, index) => (
                  <div
                    key={index}
                    class={['shortcuts-item', { 'shortcuts-item-active': index === this.selectedIndex }]}
                    onClick={() => this.handleShortcutClick(item, index)}>{item.text}</div>
                ))
              }
            </div>
          );
        }
      }
      shortcuts = <div class={this.resolveClassName('picker-panel-sidebar')}>{inner}</div>;
    }

    return (
      <div
        class={[
          this.resolveClassName('picker-panel-body-wrapper'),
          this.resolveClassName('date-picker-with-range'),
          (this.shortcuts.length || this.$slots.shortcuts) ? this.resolveClassName('picker-panel-with-sidebar') : '',
        ]}
        onMousedown={(e: MouseEvent) => {
          e.preventDefault();
        }}
      >
        <div
          class={[
            this.resolveClassName('picker-panel-body'),
            this.showTime ? this.resolveClassName('picker-panel-body-time') : this.resolveClassName('picker-panel-body-date'),
          ]}>
          {/* left panel */}
          <div
            class={[this.resolveClassName('picker-panel-content'), this.resolveClassName('picker-panel-content-left')]}
            v-show={!this.isTime}
            style='width: 261px;'>
            <div class={this.resolveClassName('date-picker-header')} v-show={this.currentView !== 'time'}>
              <span class={iconBtnCls('prev', '-double')} onClick={() => this.prevYear('left')}>
                <AngleDoubleLeft style={{ fontSize: '20px', lineHeight: 1, verticalAlign: 'text-bottom' }}></AngleDoubleLeft>
              </span>
              {
                this.leftPickerTable === 'date-table'
                  ? (
                    <span class={iconBtnCls('prev')} onClick={() => this.prevMonth('left')} v-show={this.currentView === 'date'}>
                      <AngleLeft style={{ fontSize: '20px', lineHeight: 1, verticalAlign: 'text-bottom' }}></AngleLeft>
                    </span>
                  )
                  : ''
              }
              {
                this.leftDatePanelLabel && Object.keys(this.leftDatePanelLabel).length > 0
                  ? (
                    <span>
                      <span
                        class={this.resolveClassName('date-picker-header-label')}
                        v-show={this.leftShowLabelFirst}
                        onClick={() => this.leftDatePanelLabel.labels[0].handler}>
                        {this.leftDatePanelLabel.labels[0].label}
                      </span>
                      {this.leftDatePanelView === 'date' ? ` ${this.leftDatePanelLabel.separator} ` : ' '}
                      <span
                        class={this.resolveClassName('date-picker-header-label')}
                        v-show={this.leftShowLabelSecond}
                        onClick={() => this.leftDatePanelLabel.labels[1].handler}>
                        {this.leftDatePanelLabel.labels[1].label}
                      </span>
                    </span>
                  )
                  : ''
              }
              {
                this.splitPanels || this.leftPickerTable !== 'date-table'
                  ? (
                    <span class={iconBtnCls('next', '-double')} onClick={() => this.nextYear('left')}>
                      <AngleDoubleRight style={{ fontSize: '20px', lineHeight: 1, verticalAlign: 'text-bottom' }}></AngleDoubleRight>
                    </span>
                  )
                  : ''
              }
              {
                this.splitPanels || this.leftPickerTable === 'date-table'
                  ? (
                    <span class={iconBtnCls('next')} onClick={() => this.nextMonth('left')} v-show={this.currentView === 'date'}>
                      <AngleRight style={{ fontSize: '20px', lineHeight: 1, verticalAlign: 'text-bottom' }}></AngleRight>
                    </span>
                  )
                  : ''
              }
            </div>
            {
              this.currentView !== 'time'
                ? (() => {
                  switch (this.leftPickerTable) {
                    case 'date-table':
                      return (
                        <DateTable
                          selectionMode='range'
                          tableDate={this.leftPanelDate as Date}
                          disabledDate={this.disabledDate}
                          rangeState={this.rangeState}
                          modelValue={
                            (this.preSelecting.left ? [this.dates[0]] : this.dates) as any
                          }
                          focusedDate={this.focusedDate}
                          onChangeRange={this.handleChangeRange}
                          onPick={this.panelPickerHandlers.left}/>
                      );
                    default:
                      return null;
                  }
                })()
                : ''
            }
          </div>
          {/* right panel */}
          <div
            class={[this.resolveClassName('picker-panel-content'), this.resolveClassName('picker-panel-content-right')]}
            v-show={!this.isTime}
            style='width: 261px;'>
            <div class={this.resolveClassName('date-picker-header')} v-show={this.currentView !== 'time'}>
              {
                this.splitPanels || this.rightPickerTable !== 'date-table'
                  ? (
                    <span class={iconBtnCls('prev', '-double')} onClick={() => this.prevYear('right')}>
                      <AngleDoubleLeft style={{ fontSize: '20px', lineHeight: 1, verticalAlign: 'text-bottom' }}></AngleDoubleLeft>
                    </span>
                  )
                  : ''
              }
              {
                this.splitPanels && this.rightPickerTable === 'date-table'
                  ? (
                    <span class={iconBtnCls('prev', '-double')} onClick={() => this.prevMonth('right')} v-show={this.currentView === 'date'}>
                      <AngleLeft style={{ fontSize: '20px', lineHeight: 1, verticalAlign: 'text-bottom' }}></AngleLeft>
                    </span>
                  )
                  : ''
              }
              {
                this.rightDatePanelLabel && Object.keys(this.rightDatePanelLabel).length > 0
                  ? (
                    <span>
                      <span
                        class={this.resolveClassName('date-picker-header-label')}
                        v-show={this.rightShowLabelFirst}
                        onClick={() => this.rightDatePanelLabel.labels[0].handler}>
                        {this.rightDatePanelLabel.labels[0].label}
                      </span>
                      {this.rightDatePanelView === 'date' ? ` ${this.rightDatePanelLabel.separator} ` : ' '}
                      <span
                        class={this.resolveClassName('date-picker-header-label')}
                        v-show={this.rightShowLabelSecond}
                        onClick={() => this.rightDatePanelLabel.labels[1].handler}>
                        {this.rightDatePanelLabel.labels[1].label}
                      </span>
                    </span>
                  )
                  : ''
              }
              {
                this.upToNow
                  ? (() => {
                    if ((this.rangeState.selecting || this.currentView === 'time') && this.upToNowEnable) {
                      return <span class='up-to-now' onClick={() => this.handleRangePick(new Date(), 'upToNow')}>{this.t.toNow}</span>;
                    }
                    return <span class='up-to-now disabled'>{this.t.toNow}</span>;
                  })()
                  : ''
              }
              <span class={iconBtnCls('next', '-double')} onClick={() => this.nextYear('right')}>
                <AngleDoubleRight style={{ fontSize: '20px', lineHeight: 1, verticalAlign: 'text-bottom' }}></AngleDoubleRight>
              </span>
              {
                this.rightPickerTable === 'date-table'
                  ? (
                    <span class={iconBtnCls('next')} onClick={() => this.nextMonth('right')} v-show={this.currentView === 'date'}>
                      <AngleRight style={{ fontSize: '20px', lineHeight: 1, verticalAlign: 'text-bottom' }}></AngleRight>
                    </span>
                  )
                  : ''
              }
            </div>
            {
              this.currentView !== 'time'
                ? (() => {
                  switch (this.rightPickerTable) {
                    case 'date-table':
                      return (
                        <DateTable
                          selectionMode='range'
                          tableDate={this.rightPanelDate as Date}
                          disabledDate={this.disabledDate}
                          rangeState={this.rangeState}
                          modelValue={
                            (
                              this.preSelecting.right
                                ? [this.dates[(this.dates as any).length - 1]]
                                : this.dates
                            ) as any
                          }
                          focusedDate={this.focusedDate}
                          onChangeRange={this.handleChangeRange}
                          onPick={this.panelPickerHandlers.right}/>
                      );
                    default:
                      return null;
                  }
                })()
                : ''
            }
          </div>

          {
            this.isTime
              ? (
                <TimeRange
                    ref="timePickerRef"
                    value={this.dates as any}
                    format={this.format}
                    disabledDate={this.disabledDate}
                    // v-bind={this.timePickerOptions}
                    onPick={this.handleRangePick}
                    onPick-click={this.handlePickClick}
                    onPick-clear={this.handlePickClear}
                    onPick-success={this.handlePickSuccess}
                    onPick-toggle-time={this.handleToggleTime}
                  />
              )
              : ''
          }
          {/* {
            this.confirm
              ? this.$slots.confirm?.() ?? (
                <Confirm
                  clearable={this.clearable}
                  showTime={this.showTime}
                  timeDisabled={this.timeDisabled}
                  isTime={this.isTime}
                  onPick-toggle-time={this.handleToggleTime}
                  onPick-clear={this.handlePickClear}
                  onPick-success={this.handlePickSuccess}
                ></Confirm>
              )
              : ''
          } */}
          {
            this.confirm
              ? (
                <Confirm
                  clearable={this.clearable}
                  showTime={this.showTime}
                  timeDisabled={this.timeDisabled}
                  isTime={this.isTime}
                  onPick-toggle-time={this.handleToggleTime}
                  onPick-clear={this.handlePickClear}
                  onPick-success={this.handlePickSuccess}
                  v-slots={this.$slots}
                ></Confirm>
              )
              : ''
          }
        </div>
        {shortcuts}
      </div>
    );
  },
});
