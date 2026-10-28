"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface RepositoryFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: { language: string; minStars: string }) => void;
}

// Select items can't use an empty-string value; "any" maps back to "" for onApply.
const ANY_LANGUAGE = "any";
const LANGUAGES = ["TypeScript", "JavaScript", "Python", "Go", "Rust"];

export function RepositoryFilters({ isOpen, onClose, onApply }: RepositoryFiltersProps) {
  const [language, setLanguage] = useState("");
  const [minStars, setMinStars] = useState("");

  const handleApply = () => {
    onApply({ language, minStars });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="gap-6 p-6 sm:max-w-md">
        <DialogHeader className="gap-2">
          <DialogTitle className="text-base font-semibold">Filter repositories</DialogTitle>
          <DialogDescription className="text-sm">
            Narrow the list by language and popularity.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="repo-filter-language">Language</Label>
            <Select
              value={language || ANY_LANGUAGE}
              onValueChange={(value) => setLanguage(value === ANY_LANGUAGE ? "" : value)}
            >
              <SelectTrigger id="repo-filter-language" className="w-full">
                <SelectValue placeholder="Any language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY_LANGUAGE}>Any language</SelectItem>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang} value={lang}>
                    {lang}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="repo-filter-stars">Minimum stars</Label>
            <Input
              id="repo-filter-stars"
              type="number"
              min={0}
              placeholder="e.g. 100"
              value={minStars}
              onChange={(e) => setMinStars(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" onClick={() => { setLanguage(""); setMinStars(""); }}>
            Reset
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleApply}>Apply filters</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
