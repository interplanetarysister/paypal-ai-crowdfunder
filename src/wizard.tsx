import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  ImagePlus,
  Save,
  Sparkles,
} from "lucide-react";
import {
  api,
  post,
  labels,
  DISCLOSURE,
  money,
  type Campaign,
  type Section,
} from "./api";
import { ErrorBox, Notice, useSession } from "./ui";
type Draft = Omit<
  Campaign,
  "id" | "owner_id" | "raised_cents" | "donor_count"
> & {
  id?: string;
  context: string;
  titleOptions: string[];
  descriptionOptions: string[];
};
const empty: Draft = {
  context: "",
  title: "",
  summary: "",
  story: [
    { heading: "The need", text: "" },
    { heading: "Our plan", text: "" },
    { heading: "What your support makes possible", text: "" },
  ],
  category: "community",
  goal_cents: 500000,
  status: "draft",
  organizer: "Nova Reed (fictional)",
  location: "Aurora Harbor (synthetic)",
  latitude: 37.3,
  longitude: -121.8,
  image_path: null,
  ai_request_ids: [],
  version: 1,
  fictional: true,
  titleOptions: [],
  descriptionOptions: [],
};
const draftKey = "ifund-sandbox-campaign-draft";
interface Generation {
  options?: string[];
  sections?: Section[];
  image_path?: string;
  execution: {
    id: string;
    model: string;
    status: string;
    completed_at: string;
  };
}
export function Wizard() {
  const [query] = useSearchParams(),
    navigate = useNavigate();
  const { user, status } = useSession();
  const [draft, setDraft] = useState<Draft>(() => {
      try {
        return {
          ...empty,
          ...JSON.parse(localStorage.getItem(draftKey) || "{}"),
        };
      } catch {
        return empty;
      }
    }),
    [step, setStep] = useState(0),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [style, setStyle] = useState("interstellar"),
    [execution, setExecution] = useState<Generation["execution"] | null>(null);
  const edit = query.get("draft");
  useEffect(() => {
    if (edit)
      api<{ campaign: Campaign }>("/campaigns/" + edit)
        .then((r) =>
          setDraft({ ...empty, ...r.campaign, context: r.campaign.summary }),
        )
        .catch((e) => setError(e.message));
  }, [edit]);
  useEffect(() => {
    try {
      localStorage.setItem(draftKey, JSON.stringify(draft));
    } catch {
      setError(
        "Browser draft storage is full. Save the draft to your demo account.",
      );
    }
  }, [draft]);
  const change = <K extends keyof Draft>(k: K, v: Draft[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));
  async function generate(kind: string, index?: number) {
    setError("");
    setMessage("");
    setBusy(kind + (index ?? ""));
    try {
      const r = await post<Generation>("/ai/generate", {
        kind,
        context: draft.context,
        category: draft.category,
        style,
        heading: index === undefined ? undefined : draft.story[index].heading,
      });
      setExecution(r.execution);
      setDraft((d) => {
        const n = {
          ...d,
          ai_request_ids: [...d.ai_request_ids, r.execution.id],
        };
        if (kind === "titles") n.titleOptions = r.options!;
        if (kind === "descriptions") n.descriptionOptions = r.options!;
        if (kind === "story") n.story = r.sections!;
        if (kind === "section" && index !== undefined)
          n.story = d.story.map((s, i) => (i === index ? r.sections![0] : s));
        if (kind === "image") n.image_path = r.image_path!;
        return n;
      });
      setMessage(
        "AI generation completed. Review the content before using it.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  async function save(publish: boolean) {
    setBusy("save");
    setError("");
    setMessage("");
    try {
      const payload = { ...draft, status: publish ? "published" : "draft" };
      const result = draft.id
        ? await api<{ campaign: Campaign }>("/campaigns/" + draft.id, {
            method: "PATCH",
            body: JSON.stringify(payload),
          })
        : await post<{ campaign: Campaign }>("/campaigns", payload);
      setDraft((d) => ({ ...d, ...result.campaign }));
      setMessage(
        publish ? "Published into demo discovery." : "Private draft saved.",
      );
      if (publish) {
        localStorage.removeItem(draftKey);
        navigate("/campaign/" + result.campaign.id);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy("upload");
    setError("");
    try {
      if (
        !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
        file.size > 2 * 1024 * 1024
      )
        throw Error("Choose a JPEG, PNG or WebP smaller than 2 MB.");
      // Re-encode in the browser to remove EXIF metadata and normalize uploaded pixels.
      const image = await createImageBitmap(file);
      if (image.width > 8192 || image.height > 8192)
        throw Error("Image dimensions must be under 8192 pixels.");
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      canvas
        .getContext("2d")!
        .drawImage(image, 0, 0, canvas.width, canvas.height);
      image.close();
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) =>
            b ? resolve(b) : reject(Error("Image could not be prepared")),
          "image/jpeg",
          0.9,
        ),
      );
      const response = await fetch("/api/media", {
        method: "POST",
        headers: { "content-type": "image/jpeg" },
        body: blob,
      });
      const result = (await response.json()) as {
        error?: string;
        image_path: string;
      };
      if (!response.ok) throw Error(result.error || "Upload failed");
      change("image_path", result.image_path);
      setMessage("Image uploaded to isolated demo storage.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  const steps = [
    "Your possibility",
    "AI writing",
    "Artwork",
    "Preview & publish",
  ];
  return (
    <>
      <header className="page-heading">
        <p className="eyebrow">Your story starts here</p>
        <h1>
          {draft.id
            ? "Continue your campaign"
            : "What could you make possible?"}
        </h1>
        <p>
          Build a fictional campaign, with your words and a little AI
          assistance. Your browser draft saves as you go.
        </p>
      </header>
      <Notice>{DISCLOSURE}</Notice>
      <nav className="steps" aria-label="Campaign creation steps">
        {steps.map((s, i) => (
          <button
            className={step === i ? "active" : "secondary"}
            key={s}
            aria-current={step === i ? "step" : undefined}
            onClick={() => setStep(i)}
            disabled={!!busy}
          >
            <span>{i + 1}</span>
            {s}
          </button>
        ))}
      </nav>
      <section className="panel wizard">
        <ErrorBox error={error} />
        {message && <Notice>{message}</Notice>}
        {!user && (
          <Notice>
            You can compose as a guest.{" "}
            <Link to="/login?returnTo=%2Fcreate">
              Sign in with a separate demo account
            </Link>{" "}
            to run AI, upload images or save and publish.
          </Notice>
        )}
        {step === 0 && (
          <>
            <h2>Tell us about your fictional cause</h2>
            <label>
              Campaign category
              <select
                value={draft.category}
                onChange={(e) => change("category", e.target.value)}
              >
                {Object.entries(labels).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label>
              What is the need, and what would support make possible?
              <textarea
                rows={6}
                value={draft.context}
                onChange={(e) => change("context", e.target.value)}
                maxLength={3000}
                placeholder="For example: A fictional Aurora Harbor community needs to restore its storm-damaged learning center…"
              />
            </label>
            <p className="meta">
              Use invented names and places. Never include real medical records,
              personal details or credentials.
            </p>
            <div className="form-grid">
              <label>
                Demo fundraising goal (USD)
                <input
                  type="number"
                  min="1"
                  max="1000000"
                  value={draft.goal_cents / 100}
                  onChange={(e) =>
                    change(
                      "goal_cents",
                      Math.round(Number(e.target.value) * 100),
                    )
                  }
                />
              </label>
              <label>
                Fictional organizer
                <input
                  maxLength={80}
                  value={draft.organizer}
                  onChange={(e) => change("organizer", e.target.value)}
                />
              </label>
              <label>
                Synthetic place name
                <input
                  maxLength={100}
                  value={draft.location}
                  onChange={(e) => change("location", e.target.value)}
                />
              </label>
              <div className="form-grid">
                <label>
                  Synthetic latitude
                  <input
                    type="number"
                    min="-90"
                    max="90"
                    step=".01"
                    value={draft.latitude}
                    onChange={(e) => change("latitude", Number(e.target.value))}
                  />
                </label>
                <label>
                  Synthetic longitude
                  <input
                    type="number"
                    min="-180"
                    max="180"
                    step=".01"
                    value={draft.longitude}
                    onChange={(e) =>
                      change("longitude", Number(e.target.value))
                    }
                  />
                </label>
              </div>
            </div>
          </>
        )}
        {step === 1 && (
          <>
            <div className="section-title">
              <h2>Find the words for your possibility</h2>
              <Sparkles />
            </div>
            <p>
              You can edit every word. Generation uses a real configured model
              and never substitutes canned success.
            </p>
            <div className="writing-block">
              <div className="section-title">
                <h3>1. Choose from five titles</h3>
                <button
                  disabled={!!busy || !user}
                  className="secondary"
                  onClick={() => generate("titles")}
                >
                  {busy === "titles"
                    ? "Generating…"
                    : draft.titleOptions.length
                      ? "Regenerate five titles"
                      : "Generate five titles"}
                </button>
              </div>
              <div className="options">
                {draft.titleOptions.map((s, i) => (
                  <button
                    key={i}
                    className={draft.title === s ? "option selected" : "option"}
                    aria-pressed={draft.title === s}
                    onClick={() => change("title", s)}
                  >
                    {i + 1}. {s}
                  </button>
                ))}
              </div>
              <label>
                Selected title · editable
                <input
                  value={draft.title}
                  maxLength={120}
                  onChange={(e) => change("title", e.target.value)}
                />
              </label>
            </div>
            <div className="writing-block">
              <div className="section-title">
                <h3>2. Choose from two short descriptions</h3>
                <button
                  disabled={!!busy || !user}
                  className="secondary"
                  onClick={() => generate("descriptions")}
                >
                  {busy === "descriptions"
                    ? "Generating…"
                    : draft.descriptionOptions.length
                      ? "Regenerate descriptions"
                      : "Generate two descriptions"}
                </button>
              </div>
              <div className="options">
                {draft.descriptionOptions.map((s, i) => (
                  <button
                    key={i}
                    className={
                      draft.summary === s ? "option selected" : "option"
                    }
                    aria-pressed={draft.summary === s}
                    onClick={() => change("summary", s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <label>
                Selected description · editable
                <textarea
                  value={draft.summary}
                  maxLength={600}
                  onChange={(e) => change("summary", e.target.value)}
                />
              </label>
            </div>
            <div className="writing-block">
              <div className="section-title">
                <h3>3. One complete campaign story</h3>
                <button
                  disabled={!!busy || !user}
                  className="secondary"
                  onClick={() => generate("story")}
                >
                  {busy === "story" ? "Generating…" : "Generate one story"}
                </button>
              </div>
              {draft.story.map((s, i) => (
                <div key={i} className="story-editor">
                  <label>
                    Section {i + 1} heading
                    <input
                      value={s.heading}
                      maxLength={100}
                      onChange={(e) =>
                        change(
                          "story",
                          draft.story.map((x, j) =>
                            j === i ? { ...x, heading: e.target.value } : x,
                          ),
                        )
                      }
                    />
                  </label>
                  <label>
                    Section {i + 1} text
                    <textarea
                      rows={5}
                      value={s.text}
                      maxLength={4000}
                      onChange={(e) =>
                        change(
                          "story",
                          draft.story.map((x, j) =>
                            j === i ? { ...x, text: e.target.value } : x,
                          ),
                        )
                      }
                    />
                  </label>
                  <button
                    className="ghost"
                    disabled={!!busy || !user}
                    onClick={() => generate("section", i)}
                  >
                    {busy === "section" + i
                      ? "Regenerating…"
                      : "Regenerate only this section"}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <h2>Give your possibility a world</h2>
            <p>
              Create a campaign-specific illustration, or upload an image you
              have permission to use.
            </p>
            <label>
              Illustration style
              <select value={style} onChange={(e) => setStyle(e.target.value)}>
                <option value="interstellar">Interstellar</option>
                <option value="cyberpunk">Cyberpunk</option>
                <option value="comic">Comic-inspired</option>
                <option value="futuristic">Futuristic</option>
              </select>
            </label>
            <div className="actions">
              <button
                disabled={!!busy || !user}
                onClick={() => generate("image")}
              >
                <ImagePlus size={17} />
                {busy === "image"
                  ? "Generating artwork…"
                  : "Generate campaign artwork"}
              </button>
              <label className="upload">
                Upload your image
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={!!busy || !user}
                  onChange={(e) => upload(e.target.files?.[0])}
                />
              </label>
            </div>
            {draft.image_path ? (
              <img
                className="preview-cover"
                src={draft.image_path}
                alt="Fictional campaign artwork preview"
              />
            ) : (
              <div className="art-placeholder">
                <ImagePlus size={40} />
                <p>No campaign artwork generated or uploaded yet.</p>
              </div>
            )}
            <p className="meta">
              AI image improvement is unavailable. You can generate a new
              illustration or replace your upload.
            </p>
          </>
        )}
        {step === 3 && (
          <>
            <p className="eyebrow">
              <Eye size={15} />
              Campaign preview
            </p>
            {draft.image_path && (
              <img
                className="preview-cover"
                src={draft.image_path}
                alt="Fictional campaign artwork"
              />
            )}
            <h2>{draft.title || "Your campaign title"}</h2>
            <p className="lead">
              {draft.summary || "Add a short description in the writing step."}
            </p>
            <p>
              {draft.organizer} · Fictional organizer · Goal{" "}
              {money(draft.goal_cents)}
            </p>
            {draft.story.map((s, i) => (
              <section className="story-part" key={i}>
                <h3>{s.heading}</h3>
                <p>
                  {s.text || "Write or generate this section before saving."}
                </p>
              </section>
            ))}
            <Notice>{DISCLOSURE}</Notice>
            <div className="actions">
              <button
                className="secondary"
                onClick={() => save(false)}
                disabled={!!busy || !user}
              >
                <Save size={17} />
                {busy === "save" ? "Saving…" : "Save private draft"}
              </button>
              <button onClick={() => save(true)} disabled={!!busy || !user}>
                Publish in demo discovery <ArrowRight size={17} />
              </button>
            </div>
            <Link className="back" to="/dashboard?view=organizer">
              Return to your drafts →
            </Link>
          </>
        )}
        {execution && (
          <details className="execution">
            <summary>Latest real AI request · {execution.status}</summary>
            <p>
              Model: {execution.model}
              <br />
              Request: {execution.id}
              <br />
              Completed: {execution.completed_at}
            </p>
          </details>
        )}
        <div className="wizard-footer">
          <button
            className="ghost"
            disabled={step === 0 || !!busy}
            onClick={() => setStep((s) => s - 1)}
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <span>{step + 1} of 4</span>
          {step < 3 ? (
            <button disabled={!!busy} onClick={() => setStep((s) => s + 1)}>
              Continue <ArrowRight size={16} />
            </button>
          ) : (
            <button
              className="ghost"
              disabled={!!busy}
              onClick={() => setStep(1)}
            >
              Edit writing
            </button>
          )}
        </div>
        {!status?.ai_configured && (
          <p className="meta">
            AI runtime is not configured in this environment. Manual composition
            remains available; generation will return an accurate error.
          </p>
        )}
      </section>
    </>
  );
}
