/** The question ENGINE's type registry (sprint brief §3.6) — QuestionPage
 *  renders purely from `question.type`, never a hardcoded per-question
 *  layout. Every question in a job's output (3-6 per generation) resolves
 *  to one of these six. */

import type { ComponentType } from "react";
import type { QuestionType } from "@/lib/playbook/generation";
import type { QuestionTypeProps } from "./types";
import { Multiselect } from "./Multiselect";
import { SingleSelect } from "./SingleSelect";
import { TextShort, TextLong } from "./TextInputs";
import { YesNo } from "./YesNo";
import { Scale } from "./Scale";

export const QUESTION_TYPE_COMPONENTS: Record<QuestionType, ComponentType<QuestionTypeProps>> = {
  multiselect: Multiselect,
  single: SingleSelect,
  text_short: TextShort,
  text_long: TextLong,
  yes_no: YesNo,
  scale: Scale,
};

export type { QuestionTypeProps } from "./types";
