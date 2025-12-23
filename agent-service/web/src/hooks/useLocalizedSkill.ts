import { useTranslation } from 'react-i18next';
import { SkillDefinition, UserInputField, Skill } from '@/api/skills';

type SkillLike = Skill | SkillDefinition;

export function useLocalizedSkill(skill: SkillLike | null | undefined) {
  const { i18n } = useTranslation();
  const lang = i18n.language.startsWith('zh') ? 'zh' : i18n.language;

  if (!skill) {
    return { name: '', description: '' };
  }

  return {
    name: skill.i18n?.[lang]?.name || skill.name,
    description: skill.i18n?.[lang]?.description || skill.description,
  };
}

export function useLocalizedUserInput(input: UserInputField) {
  const { i18n } = useTranslation();
  const isEnglish = !i18n.language.startsWith('zh');

  return {
    label: isEnglish && input.labelEn ? input.labelEn : input.label,
    placeholder: isEnglish && input.placeholderEn ? input.placeholderEn : input.placeholder,
  };
}

export function getLocalizedUserInput(input: UserInputField, lang: string) {
  const isEnglish = !lang.startsWith('zh');
  return {
    label: isEnglish && input.labelEn ? input.labelEn : input.label,
    placeholder: isEnglish && input.placeholderEn ? input.placeholderEn : input.placeholder,
  };
}

export function getLocalizedSkillName(
  skill: SkillLike,
  lang: string
): string {
  const normalizedLang = lang.startsWith('zh') ? 'zh' : lang;
  return skill.i18n?.[normalizedLang]?.name || skill.name;
}

export function getLocalizedSkillDescription(
  skill: SkillLike,
  lang: string
): string {
  const normalizedLang = lang.startsWith('zh') ? 'zh' : lang;
  return skill.i18n?.[normalizedLang]?.description || skill.description;
}
