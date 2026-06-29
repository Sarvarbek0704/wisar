"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Quiz } from "@/components/Quiz";

export default function QuizPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  return (
    <div className="mx-auto max-w-page px-4 py-10 sm:px-6">
      <button
        onClick={() => router.back()}
        className="mb-5 inline-flex items-center gap-1.5 font-sans text-sm text-soft hover:text-accent"
      >
        <ArrowLeft size={15} />
        Orqaga
      </button>
      <Quiz quizId={id} />
    </div>
  );
}
