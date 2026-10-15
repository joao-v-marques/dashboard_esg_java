package com.joao_v_marques.dashboard_esg.wastes.waste_record;

import com.joao_v_marques.dashboard_esg.wastes.waste_record.dto.WasteRecordResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/waste-records")
public class WasteRecordController {

    private final WasteRecordService wasteRecordService;

    public WasteRecordController(WasteRecordService wasteRecordService) {
        this.wasteRecordService = wasteRecordService;
    }

    @GetMapping
    public List<WasteRecordResponse> findAll() {
        return wasteRecordService.findAll();
    }
}
