package com.joao_v_marques.dashboard_esg.wastes.waste_type;

import com.joao_v_marques.dashboard_esg.wastes.waste_type.dto.WasteTypeResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/waste-types")
public class WasteTypesController {

    private final WasteTypeService wasteTypeService;

    public WasteTypesController(WasteTypeService wasteTypeService) {
        this.wasteTypeService = wasteTypeService;
    }

    @GetMapping
    public List<WasteTypeResponse> findAll() {
        return wasteTypeService.findAll();
    }
}
