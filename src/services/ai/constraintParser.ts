import type { AiServiceConfig, DesignConstraints } from '../../types/planner';
import type { IConstraintParserService } from './interfaces';

const CHINESE_NUMERALS: Record<string, number> = {
  一: 1,
  兩: 2,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
};

function parseBudgetTWD(text: string): number | null {
  // Match "30萬", "30 萬", "25w", "300000", "300,000"
  const wanMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:萬|w|W)/);
  if (wanMatch) {
    return Math.round(parseFloat(wanMatch[1]) * 10000);
  }
  const rawMatch = text.match(/(?:預算|上限|budget)[^\d]{0,8}(\d{2,3}(?:,\d{3})+|\d{5,7})/i);
  if (rawMatch) {
    return parseInt(rawMatch[1].replace(/,/g, ''), 10);
  }
  return null;
}

export class ConstraintParserService implements IConstraintParserService {
  private config: AiServiceConfig;

  constructor(config: AiServiceConfig) {
    this.config = config;
  }

  async parsePromptToConstraints(
    prompt: string,
    selectedTags: string[]
  ): Promise<DesignConstraints> {
    const combined = `${selectedTags.join(' ')} ${prompt}`.trim();

    if (this.config.mode === 'live' && this.config.llmApiKey) {
      try {
        const res = await fetch(this.config.llmEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.config.llmApiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            response_format: { type: 'json_object' },
            messages: [
              {
                role: 'system',
                content:
                  'Extract interior design constraints into JSON: {pets:number, scratchResistant:boolean, catPathway:boolean, maxBudgetTWD:number|null, preserveItems:string[], entrywayDustZone:boolean, extraStorage:boolean, accessibilityClearance:boolean, naturalLightPriority:boolean, customNotes:string[]}',
              },
              { role: 'user', content: combined },
            ],
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}');
          return {
            pets: Number(parsed.pets) || 0,
            scratchResistant: Boolean(parsed.scratchResistant),
            catPathway: Boolean(parsed.catPathway),
            maxBudgetTWD: parsed.maxBudgetTWD ?? null,
            preserveItems: Array.isArray(parsed.preserveItems) ? parsed.preserveItems : [],
            entrywayDustZone: Boolean(parsed.entrywayDustZone),
            extraStorage: Boolean(parsed.extraStorage),
            accessibilityClearance: Boolean(parsed.accessibilityClearance),
            naturalLightPriority: Boolean(parsed.naturalLightPriority),
            customNotes: Array.isArray(parsed.customNotes) ? parsed.customNotes : [],
          };
        }
      } catch {
        // Fallback gracefully to deterministic bilingual parser
      }
    }

    // Deterministic Bilingual Natural Language Parser
    let pets = 0;
    const petCountMatch = combined.match(/([一兩二三四五\d]+)\s*(?:隻|只)?\s*(?:貓|狗|毛孩|寵物)/);
    if (petCountMatch) {
      const token = petCountMatch[1];
      pets = CHINESE_NUMERALS[token] ?? (parseInt(token, 10) || 1);
    } else if (/貓|寵物|cat|pet/i.test(combined)) {
      pets = 1;
    }

    const scratchResistant =
      pets > 0 || /防抓|耐磨|貓抓布|scratch/i.test(combined);
    const catPathway =
      /貓跳台|貓動線|貓道|cat\s*tree|two_cats/i.test(combined) || pets >= 2;
    const maxBudgetTWD = parseBudgetTWD(combined);

    const preserveItems: string[] = [];
    if (/保留.*餐桌|實木餐桌/.test(combined)) preserveItems.push('原有實木餐桌');
    if (/保留.*沙發/.test(combined)) preserveItems.push('現有沙發');
    if (/保留.*茶几|實木茶几|keep_solid_table/.test(combined))
      preserveItems.push('原有實木茶几');
    if (/保留.*床/.test(combined)) preserveItems.push('現有雙人床');

    const entrywayDustZone = /玄關|落塵區|穿鞋椅|entry_dust_zone/i.test(combined);
    const extraStorage = /收納|系統櫃|儲物|櫃體|heavy_storage/i.test(combined);
    const accessibilityClearance =
      /無障礙|輪椅|推車|90\s*cm|barrier_free/i.test(combined);
    const naturalLightPriority = /採光|通風|窗|日光/i.test(combined);

    const customNotes: string[] = [];
    if (pets > 0) customNotes.push(`偵測 ${pets} 隻寵物家庭，優先推薦耐磨耐抓材與低甲醛地板`);
    if (entrywayDustZone) customNotes.push('規劃玄關防污落塵區（建議預留 1.2~1.5 坪耐磨磚區）');
    if (extraStorage) customNotes.push('強化沿牆高坪效系統收納櫃（避開冷氣與電箱保護區）');
    if (accessibilityClearance) customNotes.push('人體工學走道淨寬基準由 75cm 提升至 90cm');
    if (preserveItems.length > 0)
      customNotes.push(`鎖定保留項目：${preserveItems.join('、')}`);

    return {
      pets,
      scratchResistant,
      catPathway,
      maxBudgetTWD,
      preserveItems,
      entrywayDustZone,
      extraStorage,
      accessibilityClearance,
      naturalLightPriority,
      customNotes,
    };
  }
}
