import {
  type ChangeEvent,
  type MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useId,
} from "react";
import { Settings as SettingsIcon } from "lucide-react";
import { Formatter, Renderer, Stave, StaveNote, Voice } from "vexflow";
import type { Route } from "./+types/home";

type AnswerMode = "solfege" | "letter" | "number" | "piano";
type Language = "en" | "zh";

type Clef = "treble" | "bass";

type NoteDefinition = {
  id: string;
  clef: Clef;
  key: string;
  solfegeIndex: number;
  letter: string;
  number: string;
  piano: string;
};

type BaseNote = Omit<NoteDefinition, "id" | "clef">;

const SOLFEGE_LABELS: Record<Language, string[]> = {
  en: ["Do", "Re", "Mi", "Fa", "So", "La", "Ti"],
  zh: ["Do", "Re", "Mi", "Fa", "So", "La", "Si"],
};

const TREBLE_NOTES: BaseNote[] = [
  { key: "g/3", solfegeIndex: 4, letter: "G", number: "5", piano: "G3" },
  { key: "a/3", solfegeIndex: 5, letter: "A", number: "6", piano: "A3" },
  { key: "b/3", solfegeIndex: 6, letter: "B", number: "7", piano: "B3" },
  { key: "c/4", solfegeIndex: 0, letter: "C", number: "1", piano: "C4" },
  { key: "d/4", solfegeIndex: 1, letter: "D", number: "2", piano: "D4" },
  { key: "e/4", solfegeIndex: 2, letter: "E", number: "3", piano: "E4" },
  { key: "f/4", solfegeIndex: 3, letter: "F", number: "4", piano: "F4" },
  { key: "g/4", solfegeIndex: 4, letter: "G", number: "5", piano: "G4" },
  { key: "a/4", solfegeIndex: 5, letter: "A", number: "6", piano: "A4" },
  { key: "b/4", solfegeIndex: 6, letter: "B", number: "7", piano: "B4" },
  { key: "c/5", solfegeIndex: 0, letter: "C", number: "1", piano: "C5" },
  { key: "d/5", solfegeIndex: 1, letter: "D", number: "2", piano: "D5" },
];

const BASS_NOTES: BaseNote[] = [
  { key: "e/2", solfegeIndex: 2, letter: "E", number: "3", piano: "E2" },
  { key: "f/2", solfegeIndex: 3, letter: "F", number: "4", piano: "F2" },
  { key: "g/2", solfegeIndex: 4, letter: "G", number: "5", piano: "G2" },
  { key: "a/2", solfegeIndex: 5, letter: "A", number: "6", piano: "A2" },
  { key: "b/2", solfegeIndex: 6, letter: "B", number: "7", piano: "B2" },
  { key: "c/3", solfegeIndex: 0, letter: "C", number: "1", piano: "C3" },
  { key: "d/3", solfegeIndex: 1, letter: "D", number: "2", piano: "D3" },
  { key: "e/3", solfegeIndex: 2, letter: "E", number: "3", piano: "E3" },
  { key: "f/3", solfegeIndex: 3, letter: "F", number: "4", piano: "F3" },
  { key: "g/3", solfegeIndex: 4, letter: "G", number: "5", piano: "G3" },
  { key: "a/3", solfegeIndex: 5, letter: "A", number: "6", piano: "A3" },
  { key: "b/3", solfegeIndex: 6, letter: "B", number: "7", piano: "B3" },
  { key: "c/4", solfegeIndex: 0, letter: "C", number: "1", piano: "C4" },
];

const annotateNotes = (clef: Clef, notes: BaseNote[]): NoteDefinition[] =>
  notes.map((note) => ({
    ...note,
    clef,
    id: `${clef}-${note.piano}`,
  }));

const NOTE_POOL: NoteDefinition[] = [
  ...annotateNotes("bass", BASS_NOTES),
  ...annotateNotes("treble", TREBLE_NOTES),
];

const UI_STRINGS: Record<
  Language,
  {
    title: string;
    tagline: string;
    prompt: string;
    settings: string;
    language: string;
    answerMode: string;
    answerModes: Record<AnswerMode, string>;
    correct: string;
    incorrect: string;
    correctAnswerLabel: string;
    next: string;
    stats: string;
    accuracy: string;
    questionLabel: string;
    idleHint: string;
    close: string;
  }
> = {
  en: {
    title: "Get Sheet Done",
    tagline:
      "Build instant recognition with randomized treble & bass clef drills.",
    prompt: "Which answer matches this note?",
    settings: "Settings",
    language: "Language",
    answerMode: "Answer mode",
    answerModes: {
      solfege: "Solfege (Do Re Mi)",
      letter: "Letter names (C D E)",
      number: "Numbered notation (1 2 3)",
      piano: "Piano keyboard",
    },
    correct: "Correct!",
    incorrect: "Not quite.",
    correctAnswerLabel: "Correct answer",
    next: "Next question",
    stats: "Progress",
    accuracy: "Accuracy",
    questionLabel: "Question",
    idleHint: "Tap an option below.",
    close: "Close",
  },
  zh: {
    title: "Get Sheet Done",
    tagline: "随机高音与低音谱号练习，快速锁定正确音名。",
    prompt: "这个音符对应什么？",
    settings: "设置",
    language: "语言",
    answerMode: "答题模式",
    answerModes: {
      solfege: "唱名（哆来咪）",
      letter: "音名（C D E）",
      number: "简谱（1 2 3）",
      piano: "钢琴按键",
    },
    correct: "答对了！",
    incorrect: "再想想。",
    correctAnswerLabel: "正确答案",
    next: "下一题",
    stats: "进度",
    accuracy: "正确率",
    questionLabel: "题目",
    idleHint: "点击下面的选项。",
    close: "关闭",
  },
};

type Strings = (typeof UI_STRINGS)[Language];

const ANSWER_MODE_LIST: AnswerMode[] = ["solfege", "letter", "number", "piano"];

const WHITE_PIANO_KEYS = NOTE_POOL.reduce<
  { id: string; solfegeIndex: number }[]
>((keys, note) => {
  if (!keys.some((entry) => entry.id === note.piano)) {
    keys.push({ id: note.piano, solfegeIndex: note.solfegeIndex });
  }
  return keys;
}, []);

const BLACK_PIANO_KEYS = [
  { id: "F#2", anchorIndex: 1 },
  { id: "G#2", anchorIndex: 2 },
  { id: "A#2", anchorIndex: 3 },
  { id: "C#3", anchorIndex: 5 },
  { id: "D#3", anchorIndex: 6 },
  { id: "F#3", anchorIndex: 8 },
  { id: "G#3", anchorIndex: 9 },
  { id: "A#3", anchorIndex: 10 },
  { id: "C#4", anchorIndex: 12 },
  { id: "D#4", anchorIndex: 13 },
  { id: "F#4", anchorIndex: 15 },
  { id: "G#4", anchorIndex: 16 },
  { id: "A#4", anchorIndex: 17 },
  { id: "C#5", anchorIndex: 19 },
];

const getAnswer = (
  note: NoteDefinition,
  mode: AnswerMode,
  language: Language,
) => {
  switch (mode) {
    case "solfege":
      return SOLFEGE_LABELS[language][note.solfegeIndex];
    case "letter":
      return note.letter;
    case "number":
      return note.number;
    case "piano":
      return note.piano;
  }
};

const getRandomNote = (excludeId?: string): NoteDefinition => {
  if (NOTE_POOL.length === 1) {
    return NOTE_POOL[0];
  }

  let candidate = NOTE_POOL[Math.floor(Math.random() * NOTE_POOL.length)];

  while (candidate.id === excludeId) {
    candidate = NOTE_POOL[Math.floor(Math.random() * NOTE_POOL.length)];
  }

  return candidate;
};

const buildChoices = (
  note: NoteDefinition,
  mode: AnswerMode,
  language: Language,
): string[] => {
  const correct = getAnswer(note, mode, language);
  if (mode === "piano") {
    return [correct];
  }

  const allValues = Array.from(
    new Set(NOTE_POOL.map((item) => getAnswer(item, mode, language))),
  );
  const distractors: string[] = [];
  const pool = allValues.filter((value) => value !== correct);

  while (distractors.length < Math.min(3, pool.length)) {
    const candidate = pool[Math.floor(Math.random() * pool.length)];
    if (!distractors.includes(candidate)) {
      distractors.push(candidate);
    }
  }

  return shuffle([correct, ...distractors]);
};

const shuffle = (values: string[]) => {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Get Sheet Done! - 五线谱阅读练习 | Staff Reading Trainer" },
    {
      name: "description",
      content:
        "Randomized treble and bass clef drills with solfege, letter, numbered, or piano-key answers.",
    },
  ];
}

export default function Home() {
  const [language, setLanguage] = useState<Language>("en");
  const [answerMode, setAnswerMode] = useState<AnswerMode>("solfege");
  const [currentNote, setCurrentNote] = useState<NoteDefinition>(() =>
    getRandomNote(),
  );
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "correct" | "incorrect">(
    "idle",
  );
  const [questionsServed, setQuestionsServed] = useState(1);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const strings = UI_STRINGS[language];

  const correctAnswer = useMemo(
    () => getAnswer(currentNote, answerMode, language),
    [answerMode, currentNote, language],
  );

  const choices = useMemo(
    () => buildChoices(currentNote, answerMode, language),
    [answerMode, currentNote, language],
  );

  const goToNext = useCallback(() => {
    setCurrentNote((prev) => getRandomNote(prev?.id));
    setSelectedAnswer(null);
    setStatus("idle");
    setQuestionsServed((prev) => prev + 1);
  }, []);

  const closeSettings = useCallback(() => {
    setIsSettingsOpen(false);
  }, []);

  const openSettings = useCallback(() => {
    setIsSettingsOpen(true);
  }, []);

  useEffect(() => {
    setSelectedAnswer(null);
    setStatus("idle");
  }, [answerMode, language]);

  useEffect(() => {
    let timer: number | undefined;
    if (status === "correct") {
      timer = window.setTimeout(() => {
        goToNext();
      }, 1000);
    }
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [goToNext, status]);

  useEffect(() => {
    if (!isSettingsOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeSettings();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeSettings, isSettingsOpen]);

  const handleAnswer = (value: string) => {
    if (status !== "idle") return;
    setSelectedAnswer(value);
    setAnsweredCount((prev) => prev + 1);
    if (value === correctAnswer) {
      setStatus("correct");
      setCorrectCount((prev) => prev + 1);
    } else {
      setStatus("incorrect");
    }
  };

  const accuracy = useMemo(() => {
    if (answeredCount === 0) return 0;
    return Math.round((correctCount / answeredCount) * 100);
  }, [answeredCount, correctCount]);

  return (
    <main className="min-h-screen bg-white px-4 py-8 text-slate-900">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="relative rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100 backdrop-blur">
          <button
            type="button"
            onClick={openSettings}
            className="absolute right-6 top-6 inline-flex items-center justify-center rounded-full border border-slate-200/70 bg-white/80 p-2 text-slate-500 shadow-sm backdrop-blur focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 hover:text-slate-900"
            aria-label={strings.settings}
          >
            <SettingsIcon className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="flex flex-col gap-2">
            <p className="text-sm uppercase tracking-[0.2em] text-blue-500">
              {strings.title}
            </p>
            <h1 className="text-3xl font-semibold">{strings.tagline}</h1>
            <p className="text-base text-slate-500">{strings.prompt}</p>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <StatCard
              label={strings.questionLabel}
              value={`#${questionsServed}`}
            />
            <StatCard
              label={strings.stats}
              value={`${correctCount}/${answeredCount}`}
              helper={strings.accuracy + ` ${accuracy}%`}
            />
          </div>
        </header>

        <section className="rounded-3xl bg-white p-6 shadow-lg ring-1 ring-slate-100">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col items-center gap-4">
              <div className="text-sm font-medium text-blue-500">
                {strings.prompt}
              </div>
              <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-slate-50/60 px-4 py-6">
                <StaffNote noteKey={currentNote.key} clef={currentNote.clef} />
              </div>
            </div>

            <FeedbackBanner
              strings={strings}
              status={status}
              correctAnswer={correctAnswer}
              selected={selectedAnswer}
            />

            {answerMode === "piano" ? (
              <PianoKeyboard
                language={language}
                disabled={status !== "idle"}
                onSelect={handleAnswer}
                correctAnswer={correctAnswer}
                selectedAnswer={selectedAnswer}
                status={status}
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {choices.map((choice) => (
                  <AnswerButton
                    key={choice}
                    label={choice}
                    disabled={status !== "idle"}
                    onClick={() => handleAnswer(choice)}
                    selected={selectedAnswer === choice}
                    isCorrect={choice === correctAnswer}
                    status={status}
                  />
                ))}
              </div>
            )}

            {status === "incorrect" && (
              <div className="flex justify-center">
                <button
                  type="button"
                  className="rounded-full bg-blue-600 px-6 py-2 text-sm font-semibold text-white shadow hover:bg-blue-500"
                  onClick={goToNext}
                >
                  {strings.next}
                </button>
              </div>
            )}
          </div>
        </section>

        <SettingsModal
          open={isSettingsOpen}
          onClose={closeSettings}
          strings={strings}
          language={language}
          onLanguageChange={setLanguage}
          answerMode={answerMode}
          onAnswerModeChange={setAnswerMode}
        />
      </div>
    </main>
  );
}

type StaffNoteProps = {
  noteKey: string;
  clef: Clef;
};

function StaffNote({ noteKey, clef }: StaffNoteProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";

    const renderer = new Renderer(containerRef.current, Renderer.Backends.SVG);
    const svgWidth = 220;
    const svgHeight = 200;
    const staveWidth = 170;
    const staveX = (svgWidth - staveWidth) / 2;
    renderer.resize(svgWidth, svgHeight);
    const context = renderer.getContext();
    context.setBackgroundFillStyle("transparent");

    const stave = new Stave(staveX, 0, staveWidth, {
      spacingBetweenLinesPx: 14,
    });
    stave.addClef(clef);
    stave.setContext(context).draw();

    const note = new StaveNote({
      keys: [noteKey],
      duration: "w",
      clef,
    });

    // Use a 4/4 voice so the whole-note duration fits without overflow.
    const voice = new Voice({ numBeats: 4, beatValue: 4 }).addTickables([note]);
    new Formatter().joinVoices([voice]).format([voice], staveWidth - 40);
    voice.draw(context, stave);
  }, [clef, noteKey]);

  return (
    <div
      ref={containerRef}
      aria-label="music staff"
      role="img"
      className="music staff"
    />
  );
}

type AnswerButtonProps = {
  label: string;
  disabled: boolean;
  onClick: () => void;
  selected: boolean;
  isCorrect: boolean;
  status: "idle" | "correct" | "incorrect";
};

function AnswerButton({
  label,
  disabled,
  onClick,
  selected,
  isCorrect,
  status,
}: AnswerButtonProps) {
  const isLocked = status !== "idle";
  const isWinningSelection = isCorrect && (selected || status === "correct");
  const isLosingSelection = !isCorrect && selected && isLocked;

  let styles =
    "rounded-2xl border px-4 py-4 text-lg font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

  if (isWinningSelection) {
    styles += " border-green-500 bg-green-50 text-green-900";
  } else if (isLosingSelection) {
    styles += " border-rose-500 bg-rose-50 text-rose-900";
  } else {
    styles +=
      " border-slate-200 bg-white text-slate-900 shadow-sm hover:border-blue-300";
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`${styles} ${disabled ? "opacity-80" : ""}`}
    >
      {label}
    </button>
  );
}

type SelectorProps<T extends string> = {
  label: string;
  value: T;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  options: Array<{ value: T; label: string }>;
};

function Selector<T extends string>({
  label,
  value,
  onChange,
  options,
}: SelectorProps<T>) {
  return (
    <label className="flex flex-1 flex-col gap-1 text-sm font-medium text-slate-600">
      {label}
      <select
        value={value}
        onChange={onChange}
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

type SettingsModalProps = {
  open: boolean;
  onClose: () => void;
  strings: Strings;
  language: Language;
  onLanguageChange: (value: Language) => void;
  answerMode: AnswerMode;
  onAnswerModeChange: (value: AnswerMode) => void;
};

function SettingsModal({
  open,
  onClose,
  strings,
  language,
  onLanguageChange,
  answerMode,
  onAnswerModeChange,
}: SettingsModalProps) {
  const titleId = useId();
  const bodyId = useId();

  if (!open) return null;

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      onClick={handleBackdropClick}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-500">
              {strings.settings}
            </p>
            <h2 id={titleId} className="text-2xl font-semibold text-slate-900">
              {strings.settings}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 p-2 text-slate-500 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
            aria-label={`${strings.close} ${strings.settings}`}
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div id={bodyId} className="mt-6 flex flex-col gap-4">
          <Selector
            label={strings.language}
            value={language}
            onChange={(event) =>
              onLanguageChange(event.target.value as Language)
            }
            options={[
              { value: "en", label: "English" },
              { value: "zh", label: "中文" },
            ]}
          />
          <Selector
            label={strings.answerMode}
            value={answerMode}
            onChange={(event) =>
              onAnswerModeChange(event.target.value as AnswerMode)
            }
            options={ANSWER_MODE_LIST.map((mode) => ({
              value: mode,
              label: strings.answerModes[mode],
            }))}
          />
        </div>
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
            onClick={onClose}
          >
            {strings.close}
          </button>
        </div>
      </div>
    </div>
  );
}

type StatCardProps = {
  label: string;
  value: string;
  helper?: string;
};

function StatCard({ label, value, helper }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200/70 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      {helper && <p className="text-sm text-slate-500">{helper}</p>}
    </div>
  );
}

type FeedbackBannerProps = {
  strings: Strings;
  status: "idle" | "correct" | "incorrect";
  correctAnswer: string;
  selected: string | null;
};

function FeedbackBanner({
  strings,
  status,
  correctAnswer,
  selected,
}: FeedbackBannerProps) {
  let message = strings.idleHint;
  let style = "bg-slate-100 text-slate-700";

  if (status === "correct") {
    message = strings.correct;
    style = "bg-green-100 text-green-900";
  } else if (status === "incorrect" && selected) {
    message = `${strings.incorrect} ${strings.correctAnswerLabel}: ${correctAnswer}`;
    style = "bg-rose-100 text-rose-900";
  }

  return (
    <div className={`rounded-2xl px-4 py-3 text-sm font-medium ${style}`}>
      {message}
    </div>
  );
}

type PianoKeyboardProps = {
  disabled: boolean;
  onSelect: (value: string) => void;
  correctAnswer: string;
  selectedAnswer: string | null;
  status: "idle" | "correct" | "incorrect";
  language: Language;
};

function PianoKeyboard({
  disabled,
  onSelect,
  correctAnswer,
  selectedAnswer,
  status,
  language,
}: PianoKeyboardProps) {
  const strings = UI_STRINGS[language];
  const solfegeLabels = SOLFEGE_LABELS[language];
  const widthPercent = 100 / WHITE_PIANO_KEYS.length;

  return (
    <div>
      <div className="relative mx-auto flex w-full max-w-3xl gap-1 rounded-3xl border border-slate-200 bg-gradient-to-b from-white to-slate-100 p-4 shadow-inner">
        {WHITE_PIANO_KEYS.map((key, index) => {
          const isCorrect = status !== "idle" && key.id === correctAnswer;
          const isSelected = key.id === selectedAnswer;
          const isWrongSelection =
            status !== "idle" && isSelected && !isCorrect;
          let keyStyles =
            "relative flex-1 rounded-xl border border-slate-300 bg-white py-14 text-center text-sm font-semibold text-slate-900 shadow";

          if (isCorrect) {
            keyStyles += " border-green-500 bg-green-50 text-green-900";
          } else if (isWrongSelection) {
            keyStyles += " border-rose-500 bg-rose-50 text-rose-900";
          }

          return (
            <button
              key={key.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(key.id)}
              className={`${keyStyles} ${disabled ? "opacity-80" : ""}`}
            >
              <span className="pointer-events-none absolute inset-x-0 bottom-6 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {key.id}
              </span>
              <span className="pointer-events-none absolute inset-x-0 bottom-2 text-xs text-slate-600">
                {solfegeLabels[key.solfegeIndex]}
              </span>
            </button>
          );
        })}

        {BLACK_PIANO_KEYS.map((key) => (
          <div
            key={key.id}
            className="pointer-events-none absolute top-3 h-16 w-6 -translate-x-1/2 rounded-b-xl bg-slate-900 shadow"
            style={{
              left: `${widthPercent * (key.anchorIndex + 1)}%`,
            }}
          />
        ))}
      </div>
      <p className="mt-2 text-center text-xs text-slate-500">
        {strings.answerModes.piano}
      </p>
    </div>
  );
}
