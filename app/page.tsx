"use client";

import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import {
  Settings,
  HeartPulse
} from "lucide-react";
import { ModeToggle } from "@/components/modetoggle";
import { useState } from "react";
import { useChat } from "ai/react";
import ReportComponent from "@/components/ReportComponent";

import { useToast } from "@/components/ui/use-toast"
import ChatComponent from "@/components/chatcomponent";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";

const Home = () => {
  const { toast } = useToast()

  const [reportData, setreportData] = useState("");
  const onReportConfirmation = (data: string) => {
    setreportData(data);
    toast({
      description: "Updated!"
    });
  }

  return (
    <div className="grid h-screen w-full">
      <div className="flex flex-col">
        
        <main className="grid flex-1 overflow-auto md:grid-cols-2 lg:grid-cols-3">
          <div className="hidden md:flex flex-col">
            <ReportComponent onReportConfirmation={onReportConfirmation} />
          </div>
          <div className="lg:col-span-2">

            <header className="bg-muted/50 sticky top-0 z-10 flex h-[57px] items-center gap-1 border-b px-4">
              <div className="w-full flex flex-row justify-end gap-2">
              <Link className={buttonVariants({ variant: "outline" })} href={"pinecone"}>Update Knowledge Base</Link>
                <ModeToggle />
                <Drawer>
                  <DrawerTrigger asChild>
                    <Button variant="ghost" size="icon" className="md:hidden">
                      <Settings />
                      <span className="sr-only">Settings</span>
                    </Button>
                  </DrawerTrigger>
                  <DrawerContent className="max-h-[80vh]">
                    <ReportComponent onReportConfirmation={onReportConfirmation} />
                  </DrawerContent>
                </Drawer>
              </div>
            </header>

            <ChatComponent reportData={reportData} />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Home;
