package com.joao_v_marques.dashboard_esg.lawsuits.lawsuit;

import com.joao_v_marques.dashboard_esg.lawsuits.lawsuit.dto.LawsuitResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/lawsuits")
public class LawsuitController {

    private final LawsuitService service;

    public LawsuitController(LawsuitService service) {
        this.service = service;
    }

    @GetMapping
    public List<LawsuitResponse> findAll() {
        return service.findAll();
    }
}
