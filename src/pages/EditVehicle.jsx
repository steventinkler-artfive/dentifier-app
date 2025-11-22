import React, { useState, useEffect } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import VehicleForm from "../components/assessment/VehicleForm";

export default function EditVehiclePage() {
  const [searchParams] = useSearchParams();
  const vehicleId = searchParams.get('id');
  const returnTo = searchParams.get('returnTo');
  const navigate = useNavigate();
  
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadVehicle = async () => {
      if (!vehicleId) {
        setError("No vehicle ID provided");
        setLoading(false);
        return;
      }

      try {
        const fetchedVehicle = await base44.entities.Vehicle.get(vehicleId);
        setVehicle(fetchedVehicle);
      } catch (err) {
        console.error("Error loading vehicle:", err);
        setError("Failed to load vehicle");
      } finally {
        setLoading(false);
      }
    };

    loadVehicle();
  }, [vehicleId]);

  const handleSave = async (updatedVehicleData) => {
    try {
      await base44.entities.Vehicle.update(vehicleId, updatedVehicleData);
      if (returnTo) {
        navigate(returnTo);
      } else {
        navigate(createPageUrl("Customers"));
      }
    } catch (err) {
      console.error("Error updating vehicle:", err);
      alert("Failed to update vehicle");
    }
  };

  const handleCancel = () => {
    if (returnTo) {
      navigate(returnTo);
    } else {
      navigate(-1);
    }
  };

  if (loading) {
    return (
      <div className="p-4 max-w-md mx-auto">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400 mb-4" />
            <p className="text-slate-400">Loading vehicle...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="p-4 max-w-md mx-auto">
        <div className="text-center text-red-400 my-8">
          <p className="mb-4">{error || "Vehicle not found"}</p>
          <Button onClick={handleCancel} className="pink-gradient text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-md mx-auto space-y-4 bg-slate-950 min-h-screen">
      <div className="mb-4">
        <Button
          variant="ghost"
          onClick={handleCancel}
          className="text-slate-300 hover:text-white hover:bg-slate-800 px-2 py-1 h-auto"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white">Edit Vehicle</h1>
        <p className="text-slate-300 text-sm">
          {vehicle.year} {vehicle.make} {vehicle.model}
        </p>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Vehicle Details</CardTitle>
        </CardHeader>
        <CardContent>
          <VehicleForm
            vehicle={vehicle}
            customer={{ id: vehicle.customer_id }}
            onVehicleSubmit={handleSave}
          />
        </CardContent>
      </Card>
    </div>
  );
}