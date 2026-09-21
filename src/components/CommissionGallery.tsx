import { useEffect, useState } from "react";
import { ActionIcon, Box, Image, Modal, SimpleGrid, Stack, Text, UnstyledButton } from "@mantine/core";

export interface CommissionExample {
  /** Path under /public, e.g. "/images/commissions/didi-home.jpg". */
  src: string;
  /** Descriptive alt text for accessibility. */
  alt: string;
  /** Short caption shown under the image. */
  caption: string;
  /** Intrinsic pixel size. Lets the frame match the image's shape before it loads. */
  width: number;
  height: number;
}

// Frame and mat thickness as a share of the frame's own width. Percentage padding
// resolves against the parent's width, so the frame scales with the piece: a small
// grid tile gets a proportionally slim frame, the big lightbox one a substantial one.
const FRAME_PAD = "3%";
const MAT_PAD = "7%";
// Combined padding per side as a fraction of frame width: 0.03 + 0.07 * (1 - 2 * 0.03).
const PAD_TOTAL = 0.096;

// The faux frame + mat, shared by the grid and the lightbox so they always match.
// The parent must give it a definite width.
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <Box
      style={{
        padding: FRAME_PAD,
        background: "#2a2622",
        boxShadow: "0 6px 14px rgba(0,0,0,0.18), inset 0 0 0 1px rgba(255,255,255,0.08)",
      }}
    >
      {/* The mat: a paper border between frame and drawing. */}
      <Box style={{ padding: MAT_PAD, background: "#fafaf8", boxShadow: "inset 0 0 0 1px #e8e8e0" }}>
        {children}
      </Box>
    </Box>
  );
}

// Real past commissions, shown to convey range and quality. Clicking opens a
// lightbox rather than a new page — the work is worth seeing large, but the
// visitor never leaves the page whose one job is to move them to the form.
export function CommissionGallery({ examples }: { examples: CommissionExample[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const close = () => setOpenIndex(null);
  // Index math lives inside the updater so the effect below needs no extra deps.
  const step = (delta: number) =>
    setOpenIndex((i) => (i === null ? i : (i + delta + examples.length) % examples.length));

  useEffect(() => {
    if (openIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "ArrowRight") step(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openIndex, examples.length]);

  if (examples.length === 0) return null;

  const active = openIndex === null ? null : examples[openIndex];

  return (
    <>
      <SimpleGrid cols={{ base: 1, xs: 2, sm: 3 }} spacing="lg">
        {examples.map((ex, idx) => (
          <Stack key={ex.src} gap={6}>
            {/* Every piece hangs in an identical square "wall slot", and the frame
                is sized to the image's own shape inside it: the longer side fills
                the slot, so each piece is as large as it can be without cropping,
                and the grid stays evenly spaced whatever the aspect ratios. Frames sit at
                the bottom of the slot so each caption hugs its own frame; the slack
                lands above the frame, between rows. */}
            <Box style={{ aspectRatio: "1 / 1", display: "grid", placeItems: "end center" }}>
              <UnstyledButton
                onClick={() => setOpenIndex(idx)}
                aria-label={`View larger: ${ex.caption}`}
                style={{
                  display: "block",
                  // Slot is square, so a portrait frame is ratio-wide, a landscape one full-width.
                  width: `${Math.min(1, ex.width / ex.height) * 100}%`,
                  cursor: "zoom-in",
                }}
              >
                <Frame>
                  <Image
                    src={ex.src}
                    alt={ex.alt}
                    width={ex.width}
                    height={ex.height}
                    loading="lazy"
                    radius={0}
                    style={{ aspectRatio: `${ex.width} / ${ex.height}`, display: "block", height: "auto" }}
                  />
                </Frame>
              </UnstyledButton>
            </Box>
            <Box>
              <Text size="sm" c="dimmed" ta="center">
                {ex.caption}
              </Text>
            </Box>
          </Stack>
        ))}
      </SimpleGrid>

      <Modal
        opened={openIndex !== null}
        onClose={close}
        size="auto"
        centered
        padding={0}
        withCloseButton={false}
        radius={0}
        overlayProps={{ backgroundOpacity: 0.85, blur: 2 }}
        styles={{ content: { background: "transparent", boxShadow: "none" } }}
      >
        {active && (
          <Stack gap="xs" align="center">
            <Box style={{ position: "relative", display: "flex", justifyContent: "center" }}>
              {/* Frame width is the largest that fits both 90vw and 85vh. Frame height is
                  W * ((1 - 2p) / ratio + 2p), so solve for W against the height budget.
                  Capped at the file's own width so we never upscale past sharp. */}
              <Box
                style={{
                  width: `min(90vw, calc(85vh / ${(1 - 2 * PAD_TOTAL) / (active.width / active.height) + 2 * PAD_TOTAL}), ${active.width}px)`,
                }}
              >
                <Frame>
                  <Image
                    src={active.src}
                    alt={active.alt}
                    width={active.width}
                    height={active.height}
                    radius={0}
                    style={{
                      aspectRatio: `${active.width} / ${active.height}`,
                      display: "block",
                      height: "auto",
                      cursor: "zoom-out",
                    }}
                    onClick={close}
                  />
                </Frame>
              </Box>

              {examples.length > 1 && (
                <>
                  <ActionIcon
                    variant="filled"
                    color="dark"
                    radius="xl"
                    size="lg"
                    onClick={() => step(-1)}
                    aria-label="Previous commission"
                    style={{
                      position: "absolute",
                      left: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                    }}
                  >
                    ‹
                  </ActionIcon>
                  <ActionIcon
                    variant="filled"
                    color="dark"
                    radius="xl"
                    size="lg"
                    onClick={() => step(1)}
                    aria-label="Next commission"
                    style={{
                      position: "absolute",
                      right: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                    }}
                  >
                    ›
                  </ActionIcon>
                </>
              )}

              <ActionIcon
                variant="filled"
                color="dark"
                radius="xl"
                size="lg"
                onClick={close}
                aria-label="Close"
                style={{ position: "absolute", top: 12, right: 12 }}
              >
                ×
              </ActionIcon>
            </Box>
            <Text size="sm" c="white" ta="center">
              {active.caption}
            </Text>
          </Stack>
        )}
      </Modal>
    </>
  );
}
