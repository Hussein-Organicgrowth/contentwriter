"use client";

import { useState } from "react";
import { Share } from "lucide-react";
import { toast } from "react-hot-toast";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IWebsite } from "@/models/Website";

interface ShareDialogProps {
  website: IWebsite;
  onShare?: () => void;
}

export function ShareDialog({ website, onShare }: ShareDialogProps) {
  const [email, setEmail] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleShare = async () => {
    if (!email) {
      toast.error("Please enter an email address");
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`/api/website/share`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          websiteId: website._id,
          email,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to share website");
      }

      toast.success(`Company shared with ${email}`);
      setIsOpen(false);
      setEmail("");
      onShare?.();
    } catch (error) {
      toast.error("Failed to share company");
      console.error("Error sharing website:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-primary"
        >
          <Share className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Company</DialogTitle>
          <DialogDescription>
            Share {website.name} with another user. They will be able to view
            and generate content.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Input
              placeholder="Enter email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button
            onClick={handleShare}
            className="w-full"
            disabled={isLoading}
            variant="secondary"
          >
            {isLoading ? "Sharing..." : "Share"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
