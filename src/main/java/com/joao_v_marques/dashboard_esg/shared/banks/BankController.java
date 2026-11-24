package com.joao_v_marques.dashboard_esg.shared.banks;

import com.joao_v_marques.dashboard_esg.shared.banks.dto.BankResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/banks")
public class BankController {

    private final BankService service;

    public BankController(BankService service) {
        this.service = service;
    }

    @GetMapping
    public List<BankResponse> findAll() {
        return service.findAll();
    }
}
