import type { AbilityKey, StudentLessonRecord } from './types'

export interface AbilityDefinition {
  key: AbilityKey
  name: string
  shortName: string
  color: string
  description: string
  criteria: string[]
}

export const abilities: AbilityDefinition[] = [
  {
    key: 'thinking_score',
    name: '思维能力',
    shortName: '思维',
    color: '#2878ff',
    description: '理解问题、拆解逻辑并找到解决路径的能力。',
    criteria: [
      '回答紧扣主题，表达简洁、清晰且有逻辑',
      '遇到问题时会主动寻找解决方法',
      '能有效向同学或老师求助并解决问题',
      '能分析、比较并推断较复杂的程序逻辑',
      '理解算法逻辑并进行简单应用',
      '掌握编写规律并能自主修改程序',
      '读题后快速理解题目逻辑和含义',
      '完成课堂任务时有规划、有条理',
    ],
  },
  {
    key: 'focus_score',
    name: '专注力',
    shortName: '专注',
    color: '#ff7a45',
    description: '持续投入课堂，并在听、看、操作之间灵活切换的能力。',
    criteria: [
      '课堂大部分时间能够集中精力',
      '能兼顾老师屏幕和自己的电脑',
      '课堂中的分心时间较短',
      '听完讲解后能基本复述',
      '观察板书后能准确临摹',
      '动手编程时心无旁骛',
      '能迅速将注意力转移到新的程序逻辑',
    ],
  },
  {
    key: 'creativity_score',
    name: '创新能力',
    shortName: '创新',
    color: '#e84b8a',
    description: '迁移知识、提出不同想法并尝试新方案的能力。',
    criteria: [
      '能把学到的程序逻辑迁移到新问题中',
      '不拘泥于思维定势，能从不同角度思考',
      '敢于质疑、提问、求证或讨论',
      '能对程序做出合理且有差异的设计',
      '愿意挑战难度更高的任务',
      '能把程序功能与现实生活关联并展望作品',
      '会对问题进行深入思考并提出可实现的方案',
      '保持好奇，愿意反复尝试和探索',
    ],
  },
  {
    key: 'coding_score',
    name: '编程能力',
    shortName: '编程',
    color: '#00a878',
    description: '掌握编程知识、工具和算法，并独立完成程序的能力。',
    criteria: [
      '掌握输入输出、变量、循环等语言基础',
      '掌握数组、栈、队列、树、结构体或类等进阶知识',
      '掌握查找、排序、递归等常见算法',
      '能独立打开软件、编写、保存和读取程序',
      '能自主编写简单程序',
      '读题后能独立完成大部分程序',
      '理解算法，并能参考笔记完成实现',
    ],
  },
  {
    key: 'motivation_score',
    name: '学习动机',
    shortName: '动机',
    color: '#f4aa00',
    description: '主动拓展、迎接挑战并持续改进的内在动力。',
    criteria: [
      '学完知识后愿意主动拓展更多任务',
      '完成作品后愿意分享并接受认可',
      '愿意通过作品获得成长与荣誉',
      '能总结失败原因并提出改进方法、做好笔记',
      '有学习目标并能按目标行动',
      '面对困难有信心并愿意挑战',
    ],
  },
]

export const scoreLabels = [
  { value: 1, label: '起步', hint: '需要较多引导' },
  { value: 2, label: '萌芽', hint: '开始有所表现' },
  { value: 3, label: '稳步', hint: '基本达到预期' },
  { value: 4, label: '熟练', hint: '能够稳定运用' },
  { value: 5, label: '闪耀', hint: '表现突出且自主' },
]

export const emptyScores = {
  thinking_score: 3,
  focus_score: 3,
  creativity_score: 3,
  coding_score: 3,
  motivation_score: 3,
}

export type AbilityScores = Pick<StudentLessonRecord, AbilityKey>

export function recordToRadar(record: AbilityScores) {
  return abilities.map((ability) => ({
    ability: ability.shortName,
    fullName: ability.name,
    score: record[ability.key],
    fullMark: 5,
  }))
}
