"use client";

import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/context/language-context";

export function LanguageSwitcher() {
  const { language, setLanguage, translations } = useLanguage();

  const languageLabels: { [key: string]: string } = {
    en: "English",
    hi: "हिंदी",
    ur: "اردو",
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-border/50 bg-white/10 text-sm text-foreground/80 backdrop-blur-sm hover:bg-white/20 hover:text-foreground"
        >
          <Globe className="h-4 w-4" />
          <span>{languageLabels[language]}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40 bg-white/90 backdrop-blur-sm">
        <DropdownMenuItem onSelect={() => setLanguage("en")}>
          <span>English</span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setLanguage("hi")}>
          <span>हिंदी</span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setLanguage("ur")}>
          <span>اردو</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
